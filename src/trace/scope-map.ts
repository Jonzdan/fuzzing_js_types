import { SymbolInfo } from "./types";
import { Scope } from "./scope";

// NEXT TODO: associate scope nodes with related AST nodes (thinking all related)

export class ScopeMap {
    root: Scope;
    current: Scope;

    private nextScopeId = 1;
    private nextSymbolId = 1;

    constructor() {
        this.root = new Scope(this.nextScopeId++);
        this.current = this.root;
    }

    enterScope(name?: string) {
        const child = new Scope(this.nextScopeId++, this.current);
        this.current.children.set(name || `${child.id}`, child);
        this.current = child;
    }

    exitScope() {
        if (this.current.parent) {
            this.current = this.current.parent;
        }
    }

    declare(name: string, node: any, isGlobal: boolean = false): SymbolInfo {
        const info: SymbolInfo = {
            symbolId: this.nextSymbolId++,
            name,
            isGlobal,
            node
        };

        this.current.addVar(name, info);
        return info;
    }

    resolve(name: string): SymbolInfo | null {
        return this.current.resolve(name);
    }

    serialize(): string {
        return JSON.stringify(this.root.toJSON());
    }

    static deserialize(data: string): ScopeMap {
        const obj = JSON.parse(data);

        const sm = new ScopeMap();
        sm.root = Scope.fromJSON(obj);
        sm.current = sm.root;

        return sm;
    }
}