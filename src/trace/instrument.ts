import estraverse from "estraverse";
import * as escodegen from "escodegen";
import * as esprima from "esprima";
import { ScopeMap } from "./scope-map";
import { Identifier, Node } from "estree";
import { TraceProperty } from "./types";

export class Instrumenter {
    scopeMap: ScopeMap;
    functionStack: number[];

    constructor(scopeMap: ScopeMap) {
        this.scopeMap = scopeMap;
        this.functionStack = [];
    }

    private isGlobalScope(): boolean {
        return this.scopeMap.current === this.scopeMap.root;
    }

    instrument(code: string): string {
        const ast = esprima.parseScript(code, { loc: true });

        estraverse.traverse(ast, {
            enter: (node: Node, parent: Node | null) => {
                if (node.type === "FunctionDeclaration") {
                    this.scopeMap.enterScope(node.id.name);
                }

                if (node.type === "FunctionExpression") {
                    this.scopeMap.enterScope();
                }

                if (node.type === "VariableDeclarator") {
                    const name = (node.id as Identifier).name;
                    const isGlobal = this.isGlobalScope();

                    const info = this.scopeMap.declare(name, node, isGlobal);

                    if (!isGlobal) {
                        return;
                    }

                    const initExpr = node.init || { type: "Identifier", name: "undefined" };

                    if (node.init && isObjectInit(node.init)) {
                        // var obj = {} | var obj = new Ctor() | var arr = []
                        const className = getClassName(node.init);
                        
                        node.init = {
                            type: "CallExpression",
                            callee: traceMember("create"),
                            arguments: [
                                { type: "Literal", value: info.symbolId },
                                initExpr,
                                { type: "Literal", value: className },
                                { type: "Literal", value: node.init.type === "NewExpression" },
                                ...(
                                    node.init.type === "NewExpression" && node.init.callee.type !== "Super"
                                        ? [node.init.callee]
                                        : []
                                    )
                            ],
                            optional: false
                        };

                    } else {
                        node.init = {
                            type: "CallExpression",
                            callee: traceMember("assign"),
                            arguments: [
                                { type: "Literal", value: info.symbolId },
                                initExpr
                            ],
                            optional: false,
                        };
                    }
                }

                if (
                    node.type === "AssignmentExpression" &&
                    node.left.type === "Identifier" &&
                    node.right.type !== "AssignmentExpression"
                ) {
                    const name = node.left.name;
                    const info = this.scopeMap.resolve(name);

                    if (info && info.isGlobal) {
                        if (isObjectInit(node.right)) {
                            const className = getClassName(node.right);
                            node.right = {
                                type: "CallExpression",
                                callee: traceMember("create"),
                                arguments: [
                                    { type: "Literal", value: info.symbolId },
                                    node.right,
                                    { type: "Literal", value: className }
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
                }

                if (
                    node.type === "FunctionDeclaration" ||
                    node.type === "FunctionExpression"
                ) {
                    const fnName = node.id?.name ||
                        (
                            parent?.type === "VariableDeclarator" &&
                            parent.id.type === "Identifier"
                                ? parent.id.name
                                : "anonymous"
                        );


                    const functionId = this.scopeMap.declare(fnName, node, false).symbolId;
                    this.functionStack.push(functionId);

                    if (node.body.type === "BlockStatement") {
                        node.body.body.unshift({
                            type: "ExpressionStatement",
                            expression: {
                                type: "CallExpression",
                                callee: traceMember("enter"),
                                arguments: [
                                    { type: "Literal", value: functionId },
                                    { type: "Identifier", name: "arguments" },
                                    {
                                        type: "MemberExpression",
                                        object: { type: "Identifier", name: "arguments" },
                                        property: { type: "Identifier", name: "callee" },
                                        computed: false,
                                        optional: false
                                    }
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
                }

                if (node.type === "ReturnStatement") {
                    const functionId = this.functionStack[this.functionStack.length - 1] ?? 0;

                    node.argument = {
                        type: "CallExpression",
                        callee: traceMember("returning"),
                        arguments: [
                            { type: "Literal", value: functionId },
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
function isObjectInit(node: any): boolean {
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
function getClassName(node: any): string | null {
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
