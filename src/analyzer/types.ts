import { Node } from "estree";
import { SymbolicClassTypes, SymbolicObject } from "src/symbolic-types";
import { SymbolId, CtorTraceLog, PropTraceLog, EnterTraceLog, AssignTraceLog, ReturnTraceLog, TraceLogFormats } from "src/trace";

/**
 * Per symbol: global type + local duck types keyed on full callStack context.
 * Local key is the callStack at the point of observation, excluding the
 * symbol's own id, joined as "fnId1,fnId2,...".
 */
export type TypeEntry = {
    global: SymbolicClassTypes;
    local: Map<string, SymbolicClassTypes>;  // localKey → duck type
};

export type TypeMap = Map<SymbolId, TypeEntry>;
export const refSymbolIdName = "refId"; 

/**
 * Groups SymbolicObjects instances by className for intersection post-pass.
 * Per paper: class properties are intersection across all observed instances.
 */
export type ClassInstances = Map<string, SymbolicObject[]>;
/**
 * Same as above, but for function instances to resolve source
 */
export type FunctionInstances = Map<Function, TypeEntry>;
export type CtorPropTargets = Map<SymbolId, SymbolId[]>;
export type ParamSources = Map<SymbolId, SymbolId>;
export type DefferedRefProps = {
    readonly targetId: SymbolId;
    readonly callStack: number[];
    readonly prop: string;
    readonly isOptional: boolean,
    readonly refId: SymbolId;
}[];
export type DeferredFnParams = {
    fnEntry: TypeEntry;
    callStack: number[];
    fnId: SymbolId;
    idx: number;
    argEntry: TypeEntry;
}[];

export interface InferCtorParams {
    readonly entry: CtorTraceLog;
    readonly typeMap: TypeMap;
    readonly classInstances: ClassInstances;
    readonly functionInstances: FunctionInstances;
    readonly ctorPropTargets: CtorPropTargets;
}

export type DeferredFnProps = Array<{
    targetId: SymbolId;
    callStack: number[];
    prop: string;
    fn: Function;
    isOptional: boolean;
}>;

export interface InferPropParams {
    readonly entry: PropTraceLog;
    readonly typeMap: TypeMap;
    readonly deferredRefProps: DefferedRefProps;
    readonly functionInstances: FunctionInstances;
    readonly ctorPropTargets: CtorPropTargets;
    readonly paramSources: ParamSources;
    readonly deferredFnProps: DeferredFnProps;
}

export interface InferEnterParams {
    readonly entry: EnterTraceLog;
    readonly typeMap: TypeMap;
    readonly deferredFnParams: DeferredFnParams;
    readonly functionInstances: FunctionInstances;
}

export interface InferAssignParams {
    readonly nodeType: Node['type'] | undefined;
    readonly entry: AssignTraceLog;
    readonly typeMap: TypeMap;
    readonly functionInstances: FunctionInstances;
    readonly deferredReturnFns: DeferredReturnFns;
}

export interface InferReturnParams {
    readonly entry: ReturnTraceLog;
    readonly typeMap: TypeMap;
    readonly deferredReturnFns: DeferredReturnFns;
    readonly functionInstances: FunctionInstances;
}

export type DeferredReturnFns = Array<
    | {
        readonly kind: "return";
        readonly fnEntry: TypeEntry;
        readonly fn: Function;
    }
    | {
        readonly kind: "assign";
        readonly targetId: SymbolId;
        readonly fn: Function;
    }
    | {
        readonly kind: "alias";
        readonly targetId: SymbolId;
        readonly aliasRefId: SymbolId;
    }
>;

export interface ProcessLogsParams {
    readonly entry: TraceLogFormats;
    readonly typeMap: TypeMap;
    readonly deferredFnProps: DeferredFnProps;
    readonly deferredRefProps: DefferedRefProps;
    readonly deferredReturnFns: DeferredReturnFns;
    readonly functionInstances: FunctionInstances;
    readonly ctorPropTargets: CtorPropTargets;
    readonly paramSources: ParamSources;
    readonly classInstances: ClassInstances;
    readonly deferredFnParams: DeferredFnParams;
    readonly nodeType: Node['type'] | undefined;
}

export interface ProcessDeferredRefPropsParams {
    readonly typeMap: TypeMap;
    readonly deferredRefProps: DefferedRefProps;
    readonly ctorPropTargets: CtorPropTargets;
}
