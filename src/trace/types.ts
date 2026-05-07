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

export interface EnterTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.enter;
    readonly args: unknown[];
    readonly fn: Function;
    readonly callStack: number[]; 
}

export interface ReturnTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.returning;
    readonly args: unknown[];
    readonly value?: any;
    readonly refId?: number;
    readonly callStack: number[];
}

export interface ExitTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.exit;
    readonly callStack: number[]; 
}

export interface AssignTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.assign;
    readonly value?: any;
    readonly refId?: number;
}

export interface PropTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.prop;
    readonly prop: string;
    readonly value: any;
    readonly refId?: number;
    readonly isRead: boolean;
    readonly isDeletion: boolean;
    readonly isInitial: boolean;
    readonly callStack: number[]; 
}

export interface CtorTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.ctor;
    readonly fn: Function | null;
}

export interface CreateTraceLog extends BaseTraceLog {
    readonly type: typeof TracePropertyNames.create;
    readonly className: string | null;
    readonly isArray: boolean;
    readonly callStack: number[]; 
}

export type TraceLogFormats = EnterTraceLog | ReturnTraceLog | ExitTraceLog | AssignTraceLog | CtorTraceLog | PropTraceLog | CreateTraceLog;
