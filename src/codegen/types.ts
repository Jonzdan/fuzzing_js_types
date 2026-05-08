import { TypeMap } from "src/analyzer";
import { ClassInstances, TypeEntry } from "src/analyzer/types";
import { FunctionType } from "src/constants";
import { ScopeMap } from "src/trace";
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

export interface TraverseAnonymousFunctionParams {
    readonly sf: SourceFile;
    readonly scopeMap: ScopeMap;
    readonly typeMap: TypeMap;
    readonly node: FunctionDeclaration | FunctionExpression;
    readonly scopeStack: Scope[];
    readonly traverse: (node: Node) => void;
    readonly dtsLines: string[];
    readonly classInstances: ClassInstances;
}
