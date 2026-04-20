import estraverse from "estraverse";
import * as escodegen from "escodegen";
import * as esprima from "esprima";
import { ScopeMap } from "./scope-map";
import { Identifier, Node } from "estree";
import { TracePropertyNames } from "./types";

export class Instrumenter {
    scopeMap: ScopeMap;
    fnStack: number[];

    constructor(scopeMap: ScopeMap) {
        this.scopeMap = scopeMap;
        this.fnStack = [];
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
                    // Always true in ES5
                    const name = (node.id as Identifier).name;

                    const info = this.scopeMap.declare(
                        name,
                        node,
                        this.scopeMap.current === this.scopeMap.root
                    );

                    const initExpr =
                        node.init || { type: "Identifier", name: "undefined" };

                    if (node.init && node.init.type === "ObjectExpression") {
                        node.init = {
                            type: "CallExpression",
                            callee: traceMember("create"),
                            arguments: [
                                { type: "Literal", value: info.symbolId },
                                initExpr,
                                { type: "Literal", value: null }
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

                    if (info) {
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

                if (
                    node.type === "FunctionDeclaration" ||
                    node.type === "FunctionExpression"
                ) {
                    const fnName = node.id?.name ||
                        (
                            parent?.type === "VariableDeclarator" && parent.id.type === "Identifier"
                            ? parent.id.name
                            : "anonymous"
                        );

                    const fnId = this.scopeMap.declare(fnName, node, false).symbolId;
                    this.fnStack.push(fnId);

                    if (node.body.type === "BlockStatement") {
                        node.body.body.unshift({
                            type: "ExpressionStatement",
                            expression: {
                                type: "CallExpression",
                                callee: traceMember("enter"),
                                arguments: [
                                    { type: "Literal", value: fnId },
                                    { type: "Identifier", name: "arguments" },
                                    { type: "Literal", value: node.id?.name || null }
                                ],
                                optional: false,
                            }
                        });
                    }
                }

                if (node.type === "ReturnStatement") {
                    const fnId =
                        this.fnStack[this.fnStack.length - 1] ?? 0;

                    node.argument = {
                        type: "CallExpression",
                        callee: traceMember("returning"),
                        arguments: [
                            { type: "Literal", value: fnId },
                            node.argument || {
                                type: "Identifier",
                                name: "undefined"
                            }
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
                    this.fnStack.pop();
                }
            }
        });

        return escodegen.generate(ast);
    }
}

function traceMember(prop: TracePropertyNames) {
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
