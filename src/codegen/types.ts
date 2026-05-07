import { TypeMap } from "src/analyzer";
import { TypeEntry } from "src/analyzer/types";
import { FunctionType } from "src/constants";
import { ScopeMap, SymbolId } from "src/trace";
import { Scope } from "src/trace/scope";
import { FunctionDeclaration, FunctionExpression, Node, ParameterDeclaration, SourceFile } from "ts-morph";

export interface ParseBuiltParams {
    readonly built: FunctionType;
    readonly params: ParameterDeclaration[];
    readonly curScope: Scope;
    readonly typeMap: TypeMap;
    readonly entry: TypeEntry
    readonly id: number;
}

export interface ParseFunctionDeclarationsParams {
    readonly currentScope: Scope;
    readonly typeMap: TypeMap;
    readonly id: SymbolId;
    readonly functionName: string;
    readonly node: FunctionDeclaration | FunctionExpression;
}

export interface TraverseAnonymousFunctionParams {
    readonly sf: SourceFile;
    readonly scopeMap: ScopeMap;
    readonly typeMap: TypeMap;
    readonly node: FunctionDeclaration | FunctionExpression;
    readonly scopeStack: Scope[];
    readonly traverse: (node: Node) => void;
}