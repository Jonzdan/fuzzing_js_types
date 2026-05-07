import estraverse from "estraverse";
import * as escodegen from "escodegen";
import * as esprima from "esprima";
import { ScopeMap } from "./scope-map";
import { AssignmentExpression, Identifier, Node, VariableDeclarator, FunctionDeclaration, FunctionExpression } from "estree";
import { TraceProperty } from "./types";

export class Instrumenter {
    private readonly scopeMap: ScopeMap;
    private readonly functionStack: number[];

    constructor(scopeMap: ScopeMap) {
        this.scopeMap = scopeMap;
        this.functionStack = [];
    }

    private isGlobalScope(): boolean {
        return this.scopeMap.current === this.scopeMap.root;
    }

    private instrumentVariable(node: VariableDeclarator): void {
        // Guaranteed in ES5 JS
        const name = (node.id as Identifier).name;
        const isGlobal = this.isGlobalScope();
        const info = this.scopeMap.declare(name, node, isGlobal);

        if (!isGlobal) {
            return;
        }

        const initExpression = node.init || { type: "Identifier", name: "undefined" };

        if (!node.init || !isObjectInit(node.init)) {
            node.init = {
                type: "CallExpression",
                callee: traceMember("assign"),
                arguments: [
                    { type: "Literal", value: info.symbolId },
                    initExpression
                ],
                optional: false,
            };
            return;
        }
        
        node.init = {
            type: "CallExpression",
            callee: traceMember("create"),
            arguments: [
                { type: "Literal", value: info.symbolId },
                initExpression,
                { type: "Literal", value: getClassName(node.init) },
                { type: "Literal", value: node.init.type === "NewExpression" },
                ...(
                    node.init.type === "NewExpression" && node.init.callee.type !== "Super"
                        ? [node.init.callee]
                        : []
                    )
            ],
            optional: false
        };
    }

    private instrumentAssignment(node: AssignmentExpression): void {
        const name = (node.left as Identifier).name;
        const info = this.scopeMap.resolve(name);

        if (!info || !info.isGlobal) {
            return;
        }

        if (isObjectInit(node.right)) {
            node.right = {
                type: "CallExpression",
                callee: traceMember("create"),
                arguments: [
                    { type: "Literal", value: info.symbolId },
                    node.right,
                    { type: "Literal", value: getClassName(node.right) }
                ],
                optional: false,
            };
        } else {
            node.right = {
                type: "CallExpression",
                callee: traceMember("assign"),
                arguments: [
                    { type: "Literal", value: info.symbolId },
                    node.right
                ],
                optional: false,
            };
        }
    }

    private instrumentFunction(node: FunctionExpression | FunctionDeclaration, parent: Node | null) {
        const functionId = this.scopeMap.declare(
            node.id?.name ||
             (
                parent?.type === "VariableDeclarator" && parent.id.type === "Identifier"
                    ? parent.id.name
                : parent?.type === "Property" && parent.key.type === "Identifier"
                    ? parent.key.name
                : parent?.type === "AssignmentExpression" && parent.left.type === "MemberExpression"
                    ? (parent.left.property as Identifier).name
                : "anonymous"
            ),
            node
        ).symbolId;
        this.functionStack.push(functionId);

        if (node.body.type !== "BlockStatement") {
            return;
        }

        node.body.body.unshift({
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: traceMember("enter"),
                arguments: [
                    { type: "Literal", value: functionId },
                    { type: "Identifier", name: "arguments" },

                ],
                optional: false,
            }
        });


        /**
         * for void return paths, per the paper pg 32.
         */
        node.body.body.push({
            type: "ExpressionStatement",
            expression: {
                type: "CallExpression",
                callee: traceMember("exit"),
                arguments: [
                    { type: "Literal", value: functionId }
                ],
                optional: false,
            }
        });
        
    }

    instrument(code: string): string {
        const ast = esprima.parseScript(code, { loc: true });

        estraverse.traverse(ast, {
            enter: (node: Node, parent: Node | null) => {
                if (node.type === "VariableDeclarator") {
                    this.instrumentVariable(node);
                }

                if (
                    node.type === "AssignmentExpression" &&
                    node.left.type === "Identifier" &&
                    node.right.type !== "AssignmentExpression"
                ) {
                    this.instrumentAssignment(node);
                }   

                if (
                    node.type === "FunctionDeclaration" ||
                    node.type === "FunctionExpression"
                ) {
                    this.scopeMap.enterScope(node.id?.name || (
                        parent?.type === "Property" ? (parent.key as Identifier).name : undefined
                    ));
                    this.instrumentFunction(node, parent);
                }

                if (node.type === "ReturnStatement") {
                    node.argument = {
                        type: "CallExpression",
                        callee: traceMember("returning"),
                        arguments: [
                            { type: "Literal", value: this.functionStack[this.functionStack.length - 1] ?? 0 },
                            node.argument || { type: "Identifier", name: "undefined" }
                        ],
                        optional: false,
                    };
                }
            },

            leave: (node: Node) => {
                if (
                    node.type === "FunctionDeclaration" ||
                    node.type === "FunctionExpression"
                ) {
                    this.scopeMap.exitScope();
                    this.functionStack.pop();
                }
            }
        });

        return escodegen.generate(ast);
    }
}

/**
 * Returns true for init expressions that produce an object at runtime and
 * should be wrapped with Trace.create rather than Trace.assign.
 * 
 * "Object.create(...), new Object(), []"
 */
function isObjectInit(node: Node): boolean {
    return (
        node.type === "ObjectExpression" ||
        node.type === "ArrayExpression" ||
        node.type === "NewExpression"
    );
}

/**
 * For NewExpression nodes, extract the constructor name so Trace.create can
 * emit a `ctor` entry.  Returns null for object/array literals.
 */
function getClassName(node: Node): string | null {
    if (node.type === "NewExpression") {
        if (node.callee.type === "Identifier") {
            return node.callee.name as string;
        }
    }
    return null;
}

function traceMember(prop: TraceProperty) {
    return {
        type: "MemberExpression",
        object: {
            type: "Identifier",
            name: "Trace"
        },
        property: {
            type: "Identifier",
            name: prop
        },
        computed: false,
        optional: false
    } as const;
}
