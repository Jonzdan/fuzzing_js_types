import { SymbolInfo } from "./types";

export class Scope {
    id: number;
    parent: Scope | null;
    children: Map<string, Scope>;
    vars: Map<string, SymbolInfo>;

    constructor(id: number, parent: Scope | null = null) {
        this.id = id;
        this.parent = parent;
        this.children = new Map();
        this.vars = new Map();
    }

    addVar(name: string, info: SymbolInfo) {
        this.vars.set(name, info);
    }

    resolve(name: string): SymbolInfo | null {
        let scope: Scope | null = this;

        while (scope) {
            if (scope.vars.has(name)) {
                return scope.vars.get(name)!;
            }
            scope = scope.parent;
        }

        return null;
    }
}
