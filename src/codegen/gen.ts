import { FunctionDeclaration, FunctionExpression, Node, ParameterDeclaration, Project, SyntaxKind, VariableDeclarationKind, VariableDeclarationList } from "ts-morph";
import { TypeMap } from "../analyzer";
import { ScopeMap, SymbolId } from "../trace";
import { typeToString, SymbolicFunction, SymbolicObject } from "../symbolic-types";
import * as path from "path";
import { ParseBuiltParams, ParseFunctionDeclarationsParams, TraverseAnonymousFunctionParams } from "./types";
import { FunctionType } from "src/constants";
import { Scope } from "src/trace/scope";
import { TypeEntry } from "src/analyzer/types";

export function codegen(
    source: string,
    typeMap: TypeMap,
    scopeMap: ScopeMap,
    outputPath: string
): void {
    const project = new Project();
    const sf = project.createSourceFile(path.resolve(outputPath), source, {overwrite: true});
    const scopeStack: Scope[] = [scopeMap.root];
    const visited = new Set<Node>();

    const traverse = (node: Node) => {
        if (visited.has(node)) {
            return;
        }

        visited.add(node);
        const isFunctionScope = (Node.isFunctionExpression(node) || Node.isFunctionDeclaration(node));
        if (isFunctionScope) {
            const functionName = getEs5TypeName(node);
            if (!functionName) {
                traverseAnonymousFunction({
                    node,
                    scopeMap,
                    scopeStack,
                    sf,
                    traverse,
                    typeMap
                });
                return;
            }

            const functionScope = scopeStack.at(-1)!.children.get(functionName);
            if (!functionScope) {
                return;
            }

            scopeStack.push(functionScope);
            const id = functionScope.vars.get(functionName)?.symbolId;
            if (!id) {
                return;
            }

            parseFunctionDeclarations({
                currentScope: functionScope,
                node,
                id,
                functionName,
                typeMap,
            });
        }
        if (Node.isPropertyAssignment(node)) {
            const initializer = node.getInitializer();
            if (initializer && Node.isFunctionExpression(initializer)) {
                const fnName = node.getName(); 
                const id = getMethodSymbolId(fnName, scopeStack);
                if (id === undefined) {
                    return;
                }

                const entry = typeMap.get(id);
                if (!entry || !(entry.global instanceof SymbolicFunction)) {
                    return;
                }

                const anonScope = findScopeById(id, scopeMap);
                if (anonScope) {
                    scopeStack.push(anonScope);
                }

                annotateFunctionNode(initializer, id, entry, anonScope ?? scopeStack.at(-1)!, typeMap);

                if (anonScope) {
                    scopeStack.pop();
                }
            }            
        }

        if (Node.isVariableDeclarationList(node) && node.getDeclarationKind() === VariableDeclarationKind.Var) {
            updateVariableDeclaration(node, scopeStack, typeMap);
        }
        node.forEachChild(child => traverse(child));
        if (isFunctionScope) {
            scopeStack.pop();
        }
    }

    traverse(sf);
    // Placeholder to avoid global naming conflict
    sf.insertStatements(0, "export {};");
    // ── Write to disk ─────────────────────────────────────────────────────────
    sf.saveSync();
}

function getMethodSymbolId(fnName: string, scopeStack: Scope[]): SymbolId | undefined {
    // Search from innermost to outermost scope
    for (let i = scopeStack.length - 1; i >= 0; i--) {
        const scope = scopeStack[i]!;
        // Check direct vars
        const direct = scope.vars.get(fnName)?.symbolId;
        if (direct !== undefined) return direct;
        // Check children
        for (const child of scope.children.values()) {
            const inChild = child.vars.get(fnName)?.symbolId;
            if (inChild !== undefined) return inChild;
        }
    }
    return undefined;
}

function traverseAnonymousFunction({
    node,
    scopeMap,
    scopeStack,
    sf,
    traverse,
    typeMap,
}: TraverseAnonymousFunctionParams): void {
    const start = node.getNonWhitespaceStart();
    const { line, column } = sf.getLineAndColumnAtPos(start);
    const id = getSymbolIdByLocation(line, column - 1, scopeMap);
    if (id === undefined) {
        return;
    }

    const anonScope = findScopeById(id, scopeMap);
    if (anonScope) {
        scopeStack.push(anonScope);
    }

    const entry = typeMap.get(id);
    if (entry?.global instanceof SymbolicFunction) {
        annotateFunctionNode(node, id, entry, anonScope ?? scopeStack.at(-1)!, typeMap);
    }

    node.forEachChild(child => traverse(child));

    if (anonScope) {
        scopeStack.pop();
    }
};

function annotateFunctionNode(
    node: FunctionDeclaration | FunctionExpression,
    id: SymbolId,
    entry: TypeEntry,
    currentScope: Scope,
    typeMap: TypeMap,
    functionName?: string,
): void {
    if (!(entry.global instanceof SymbolicFunction)) {
        return;
    }

    const built = entry.global.build();
    const params = node.getParameters();

    parseBuiltParams({ built, entry, id, params, curScope: currentScope, typeMap });
    addAdditionalObservedFnParams(built, params, node);

    if (built.isCtor && functionName) {
        node.insertParameter(0, { name: "this", type: functionName });
    } else {
        node.setReturnType(typeToString(built.returnType));
    }
}

function parseFunctionDeclarations({
    currentScope,
    node,
    id,
    functionName,
    typeMap,
}: ParseFunctionDeclarationsParams): void {
    const entry = typeMap.get(id);
    if (!entry) {
        return;
    }

    annotateFunctionNode(node, id, entry, currentScope, typeMap, functionName);
}

function findScopeById(symbolId: number, scopeMap: ScopeMap): Scope | undefined {
    function walk(scope: Scope): Scope | undefined {
        for (const [, info] of scope.vars) {
            if (info.symbolId === symbolId) return scope;
        }
        for (const child of scope.children.values()) {
            const found = walk(child);
            if (found) return found;
        }
        return undefined;
    }
    return walk(scopeMap.root);
}
function updateVariableDeclaration(declList: VariableDeclarationList, scopeStack: Scope[], typeMap: TypeMap) {
    for (const decl of declList.getDeclarations()) {
        const name = decl.getName();
        const id = scopeStack.at(-1)!.vars.get(name)?.symbolId;
        if (id === undefined) {
            continue;
        }

        const entry = typeMap.get(id);
        if (!entry) {
            continue;
        }

        const built = entry.global.build();

        if (built.category === "simple") {
            if (scopeStack.some(scope => scope.children.has(built.kind))) {
                decl.getVariableStatement()?.addJsDoc("@ts-expect-error legacy ES5 constructor");
            }
            decl.setType(built.kind);
            continue;
        }

        const typeStr = entry.global.toString();
        if (typeStr && typeStr !== "void") {
            decl.setType(typeStr);
        }
    }
}

function addAdditionalObservedFnParams(built: FunctionType, params: ParameterDeclaration[], fn: FunctionDeclaration | FunctionExpression) {
    for (let idx = params.length; idx < built.params.length; idx++) {
        const inferredParam = built.params[idx];
        if (!inferredParam) {
            continue;
        }
        
        fn.addParameter({
            name: inferredParam.name ?? "undefined",
            type: typeToString(inferredParam.type),
            hasQuestionToken: true,
        });
    }
}

function parseBuiltParams({ built, entry, id, params, typeMap, curScope }: ParseBuiltParams) {
    const updateExistingParam = (param: ParameterDeclaration, paramSymbolId: SymbolId) => {
        const paramEntry = typeMap.get(paramSymbolId);
        if (paramEntry?.global instanceof SymbolicObject) {
            const localDuck = paramEntry.local.get(id.toString());
            if (localDuck) {
                param.setType(localDuck.toString());
                return;
            }
            // Fall back to global object type
            param.setType(paramEntry.global.toString());
            return;
        }
    }

    built.params.forEach((inferredParam, idx) => {
        const param = params[idx];
        if (!param || !inferredParam) {
            return;
        }

        const paramName = param.getName();
        const paramSymbolId = curScope.vars.get(paramName)?.symbolId;

        if (paramSymbolId !== undefined) {
            updateExistingParam(param, paramSymbolId);
            return;
        }

        if (inferredParam.type.category === "simple") {
            param.setType(inferredParam.type.kind);
            return;
        }

        // Everything else -- use inferred type from function's global entry
        param.setType(typeToString(inferredParam.type));
        param.setHasQuestionToken(
            entry.global instanceof SymbolicFunction && entry.global.isParamOptional(idx)
        );
    });
}

function getSymbolIdByLocation(line: number, col: number, scopeMap: ScopeMap): number | undefined {
    function walk(scope: Scope): number | undefined {
        for (const [, info] of scope.vars) {
            if (info.node?.loc?.start && info.node.loc.start.line === line && 
                info.node.loc.start.column === col) {
                return info.symbolId;
            }
        }
        for (const child of scope.children.values()) {
            const found = walk(child);
            if (found) return found;
        }
        return undefined;
    }
    return walk(scopeMap.root);
}

function getEs5TypeName(fn: Node): string | undefined {
    if (Node.isFunctionDeclaration(fn)) {
        return fn.getName();
    }

    if (Node.isFunctionExpression(fn)) {
        const fnName = fn.getName();
        if (fnName) {
            return fnName;
        }
        const varDecl = fn.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
        if (varDecl) {
            return varDecl.getName();
        }
    }

    const binary = fn.getFirstAncestorByKind(SyntaxKind.BinaryExpression);
    if (binary) {
        return binary.getLeft().getText();
    }

    return undefined;
}

