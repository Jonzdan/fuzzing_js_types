import { Node } from "estree";

export type SymbolId = number;

export const TracePropertyNames = {
    assign: "assign",
    create: "create",
    ctor: "ctor",
    prop: "prop",
    enter: "enter",
    returning: "returning",
    exit: "exit",
} as const;

export type TraceProperty =
  typeof TracePropertyNames[keyof typeof TracePropertyNames];

export interface SymbolInfo {
    symbolId: SymbolId;
    name: string;
    isGlobal: boolean;
    node: Node;
}

interface BaseTraceLog {
    readonly id: SymbolId;
}

interface EnterTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.enter;
    readonly args: unknown[];
    readonly fn: Function;
    readonly callStack: number[]; 
}

interface ReturnTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.returning;
    readonly args: unknown[];
    readonly value: any;
    readonly callStack: number[];
}

interface ExitTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.exit;
    readonly callStack: number[]; 
}

interface AssignTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.assign;
    readonly value: any;
}

interface PropTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.prop;
    readonly prop: string;
    readonly value: any;
    readonly callStack: number[]; 
}

interface CtorTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.ctor;
    readonly fn: Function | null;
}

interface CreateTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.create;
    readonly className: string | null;
    readonly callStack: number[]; 
}

export type TraceLogFormats = EnterTraceLog | ReturnTraceLog | ExitTraceLog | AssignTraceLog | CtorTraceLog | PropTraceLog | CreateTraceLog;
