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

    toJSON(): any {
        return {
            id: this.id,
            vars: Array.from(this.vars.entries()).map(([k, v]) => [
                k,
                {
                    symbolId: v.symbolId,
                    name: v.name,
                    isGlobal: v.isGlobal
                }
            ]),
            children: Array.from(this.children.entries()).map(([k, v]) => [
                k,
                v.toJSON()
            ])
        };
    }

    static fromJSON(obj: any, parent: Scope | null = null): Scope {
        const scope = new Scope(obj.id, parent);

        for (const [name, info] of obj.vars) {
            scope.vars.set(name, {
                ...info,
                node: null // AST re-linked during analysis phase?
            });
        }

        for (const [k, child] of obj.children) {
            scope.children.set(k, Scope.fromJSON(child, scope));
        }

        return scope;
    }
}
