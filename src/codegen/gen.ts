import {
    FunctionDeclaration,
    FunctionExpression,
    Node,
    Project,
    SyntaxKind,
    VariableDeclarationKind,
    VariableDeclarationList,
} from "ts-morph";
import { TypeMap } from "../analyzer";
import { ClassInstances, TypeEntry } from "../analyzer/types";
import { FunctionType } from "src/constants";
import { ScopeMap, SymbolId } from "../trace";
import { Scope } from "src/trace/scope";
import { typeToString, SymbolicFunction, SymbolicObject } from "../symbolic-types";
import { TraverseAnonymousFunctionParams } from "./types";
import * as path from "path";

type FnNode = FunctionDeclaration | FunctionExpression;

export function codegen(
    source: string,
    typeMap: TypeMap,
    scopeMap: ScopeMap,
    classInstances: ClassInstances,
    outputPath: string
): void {
    const project = new Project();
    const sf = project.createSourceFile(path.resolve(outputPath), source, { overwrite: true });
    const dts = project.createSourceFile(
        path.resolve(outputPath.replace(/\.ts$/, ".d.ts")),
        "/* AUTO-GENERATED */\n",
        { overwrite: true }
    );

    const scopeStack: Scope[] = [scopeMap.root];
    const visited = new Set<Node>();
    const dtsLines: string[] = [];

    const traverse = (node: Node) => {
        if (visited.has(node)) {
            return;
        }
        visited.add(node);

        const isFunctionScope = Node.isFunctionExpression(node) || Node.isFunctionDeclaration(node);

        if (isFunctionScope) {
            const functionName = getEs5TypeName(node);

            if (!functionName) {
                traverseAnonymousFunction({ node, scopeMap, scopeStack, sf, classInstances, traverse, typeMap, dtsLines });
                return;
            }

            const functionScope = scopeStack.at(-1)!.children.get(functionName);
            if (!functionScope) {
                return;
            }

            scopeStack.push(functionScope);

            const id = functionScope.vars.get(functionName)?.symbolId;
            if (id !== undefined) {
                const entry = typeMap.get(id);
                if (entry) {
                    const decl = buildFunctionDeclaration(functionName, node, id, classInstances, entry, functionScope, typeMap);
                    if (decl) {
                        dtsLines.push(decl);
                    }
                }
            }
        }

        if (Node.isPropertyAssignment(node)) {
            handlePropertyAssignment(node, scopeStack, scopeMap, classInstances, typeMap, dtsLines);
        }

        if (Node.isVariableDeclarationList(node) && node.getDeclarationKind() === VariableDeclarationKind.Var) {
            buildVariableDeclarations(node, scopeStack, typeMap, dtsLines);
        }

        node.forEachChild(child => traverse(child));

        if (isFunctionScope) {
            scopeStack.pop();
        }
    };

    traverse(sf);

    dts.addStatements(dtsLines.map((value) => `export ${value}`));
    dts.saveSync();
}

function traverseAnonymousFunction({
    node,
    scopeMap,
    scopeStack,
    sf,
    traverse,
    typeMap,
    classInstances,
    dtsLines,
}: TraverseAnonymousFunctionParams): void {
    const start = node.getNonWhitespaceStart();
    const { line, column } = sf.getLineAndColumnAtPos(start);
    const id = getSymbolIdByLocation(line, column - 1, scopeMap);
    if (id === undefined) {
        return;
    }

    const anonScope = findScopeById(id, scopeMap);
    const currentScope = anonScope ?? scopeStack.at(-1)!;
    if (anonScope) {
        scopeStack.push(anonScope);
    }

    const entry = typeMap.get(id);
    if (entry?.global instanceof SymbolicFunction) {
        const decl = buildFunctionDeclaration(undefined, node, id, classInstances, entry, currentScope, typeMap);
        if (decl) {
            dtsLines.push(decl);
        }
    }

    node.forEachChild(child => traverse(child));
    if (anonScope) {
        scopeStack.pop();
    }
}

function handlePropertyAssignment(
    node: Node,
    scopeStack: Scope[],
    scopeMap: ScopeMap,
    classInstances: ClassInstances,
    typeMap: TypeMap,
    dtsLines: string[]
): void {
    if (!Node.isPropertyAssignment(node)) {
        return;
    }

    const initializer = node.getInitializer();
    if (!initializer || !Node.isFunctionExpression(initializer)) {
        return;
    }

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
    const currentScope = anonScope ?? scopeStack.at(-1)!;
    if (anonScope) {
        scopeStack.push(anonScope);
    }

    const decl = buildFunctionDeclaration(fnName, initializer, id, classInstances, entry, currentScope, typeMap);
    if (decl) {
        dtsLines.push(decl);
    }

    if (anonScope) {
        scopeStack.pop();
    }
}

function buildFunctionDeclaration(
    functionName: string | undefined,
    node: FnNode,
    id: SymbolId,
    classInstances: ClassInstances,
    entry: TypeEntry,
    currentScope: Scope,
    typeMap: TypeMap,
): string | undefined {
    if (!(entry.global instanceof SymbolicFunction)) {
        return undefined;
    }

    const built = entry.global.build();
    const paramStr = buildParamString(built, node, id, entry, currentScope, typeMap);
    const returnStr = typeToString(built.returnType);

    if (built.isCtor && functionName) {
        return buildCtorClassDeclaration(functionName, paramStr, classInstances);
    }

    if (functionName) {
        return `declare function ${functionName}(${paramStr}): ${returnStr};`;
    }

    // Anonymous — emit as const if ancestor variable name is available
    const varName = node.getFirstAncestorByKind(SyntaxKind.VariableDeclaration)?.getName();
    if (varName) {
        return `declare const ${varName}: (${paramStr}) => ${returnStr};`;
    }

    return undefined;
}

function buildCtorClassDeclaration(
    name: string,
    paramStr: string,
    classInstances: ClassInstances,
): string {
    const lines: string[] = [
        `declare function ${name}(${paramStr}): ${name};`,
        `interface ${name} {`
    ];
    // Guaranteed to have at least 1 elem & first instance is complete class property intersection
    const classInstance = classInstances.get(name)?.[0];

    if (classInstance) {
        for (const [prop, type] of classInstance.getProperties().entries()) {
            lines.push(`  ${prop}: ${type.toString()};`);
        }
    }

    lines.push(`}`);
    return lines.join("\n");
}

function buildVariableDeclarations(
    declList: VariableDeclarationList,
    scopeStack: Scope[],
    typeMap: TypeMap,
    dtsLines: string[]
): void {
    for (const decl of declList.getDeclarations()) {
        const name = decl.getName();
        const id = scopeStack.at(-1)!.vars.get(name)?.symbolId;
        if (id === undefined) continue;

        const entry = typeMap.get(id);
        if (!entry) continue;

        const built = entry.global.build();
        const typeStr = built.category === "simple" ? built.kind : (entry.global.toString() ?? "any");

        if (typeStr && typeStr !== "void") {
            dtsLines.push(`declare var ${name}: ${typeStr};`);
        }
    }
}

function buildParamString(
    built: FunctionType,
    node: FnNode,
    id: SymbolId,
    entry: TypeEntry,
    currentScope: Scope,
    typeMap: TypeMap,
): string {
    return built.params
        .map((inferredParam, idx) => {
            const paramNode = node.getParameters()[idx];
            const name = inferredParam?.name ?? paramNode?.getName() ?? `param${idx}`;
            const type = resolveParamType(inferredParam, id, currentScope, typeMap);
            const isAdditional = idx >= node.getParameters().length;
            const optional = isAdditional || (entry.global instanceof SymbolicFunction && entry.global.isParamOptional(idx)) ? "?" : "";
            return `${name}${optional}: ${type}`;
        })
        .join(", ");
}

function resolveParamType(
    inferredParam: FunctionType["params"][number],
    fnId: SymbolId,
    currentScope: Scope,
    typeMap: TypeMap,
): string {
    const paramName = inferredParam?.name;
    if (paramName) {
        const paramSymbolId = currentScope.vars.get(paramName)?.symbolId;
        if (paramSymbolId !== undefined) {
            const paramEntry = typeMap.get(paramSymbolId);
            if (paramEntry?.global instanceof SymbolicObject) {
                const localDuck = paramEntry.local.get(fnId.toString());
                if (localDuck) {
                    return localDuck.toString();
                }
                return paramEntry.global.toString();
            }
        }
    }

    if (!inferredParam) {
        return "any";
    }
    return typeToString(inferredParam.type);
}

function getMethodSymbolId(fnName: string, scopeStack: Scope[]): SymbolId | undefined {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
        const scope = scopeStack[i]!;

        const direct = scope.vars.get(fnName)?.symbolId;
        if (direct !== undefined) return direct;

        for (const child of scope.children.values()) {
            const inChild = child.vars.get(fnName)?.symbolId;
            if (inChild !== undefined) return inChild;
        }
    }
    return undefined;
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

function getSymbolIdByLocation(line: number, col: number, scopeMap: ScopeMap): number | undefined {
    function walk(scope: Scope): number | undefined {
        for (const [, info] of scope.vars) {
            if (
                info.node?.loc?.start &&
                info.node.loc.start.line === line &&
                info.node.loc.start.column === col
            ) {
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
    if (Node.isFunctionDeclaration(fn)) return fn.getName();

    if (Node.isFunctionExpression(fn)) {
        const fnName = fn.getName();
        if (fnName) return fnName;

        const varDecl = fn.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
        if (varDecl) return varDecl.getName();
    }

    const binary = fn.getFirstAncestorByKind(SyntaxKind.BinaryExpression);
    if (binary) return binary.getLeft().getText();

    return undefined;
}
