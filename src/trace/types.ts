export type SymbolId = number;

export type TracePropertyNames = "assign" | "create" | "ctor" | "prop" | "enter" | "returning";

export interface SymbolInfo {
    symbolId: SymbolId;
    name: string;
    isGlobal: boolean;
    node: any; // AST node reference (paper requirement)
}
