import { SymbolicType } from "src/constants";
import { SymbolicUnion, SymbolicArray, SymbolicObject, SymbolicClassTypes, SymbolicFunction } from "../symbolic-types";
import { SymbolId, ScopeMap, SymbolInfo, rawTargets } from "../trace";
import { inferKindAndCategory } from "./infer-local";
import { TypeMap, FunctionInstances, refSymbolIdName, TypeEntry } from "./types";
import { Node } from "estree";

/**
 * Resolves a raw log value to a SymbolicType.
 * Handles refId (tracked object reference) by looking up in typeMap.
 */
export function resolveValue(value: unknown, typeMap: TypeMap, functionInstances: FunctionInstances, seen=new Set()): SymbolicType | null {
    if (value && typeof value === "object" && refSymbolIdName in value) {
        seen.add(value);
        const refEntry = typeMap.get(value.refId as SymbolId);
        return refEntry ? refEntry.global.build() : null;
    }

    if (seen.has(value)) {
        return { category: "simple", kind: "object" } as SymbolicType;
    }

    if (Array.isArray(value)) {
        if (seen.has(value)) {
            return { category: "void", kind: "void" };
        }
        seen.add(value);
        const union = new SymbolicUnion();
        for (const element of value) {
            const type = resolveValue(element, typeMap, functionInstances, seen);
            if (type) {
                union.add(type);
            }
        }
        return new SymbolicArray(union).build();
    }

    if (value !== null && typeof value === "object") {
        if (seen.has(value)) {
            return { category: "void", kind: "void" };
        }
        seen.add(value);

        const symObj = new SymbolicObject();
        const raw = rawTargets.get(value as object) ?? value as object;
        for (const [key, val] of Object.entries(raw)) {
            const type = resolveValue(val, typeMap, functionInstances, seen);
            if (type) {
                symObj.addProperty(key, type);
            }
        }
        return symObj.build();
    }

    if (typeof value === "function") {
        if (seen.has(value)) {
            return { category: "void", kind: "void" };
        }
        seen.add(value);
        const fnEntry = functionInstances.get(value);
        return fnEntry
            ? fnEntry.global.build()
            : {
                category: "function",
                kind: "function",
                params: [],
                returnType: { category: "void", kind: "void" },
                isCtor: false
            };
    }

    if (seen.has(value)) {
        return { category: "void", kind: "void" };
    }
    seen.add(value);
    return inferKindAndCategory(value) as SymbolicType;
}

/**
 * Gets or creates a TypeEntry for a symbol in the typeMap.
 * Uses the AST node type to determine which symbolic class to instantiate.
 */
export function getOrCreate(
    id: SymbolId,
    nodeType: Node['type'] | undefined,
    isArray: boolean,
    isObject: boolean,
    typeMap: TypeMap
): TypeEntry {
    if (typeMap.has(id)) {
        return typeMap.get(id)!;
    }

    let global: SymbolicClassTypes;

    if (nodeType === "FunctionDeclaration" || nodeType === "FunctionExpression") {
        global = new SymbolicFunction();
    } else if (isArray) {
        global = new SymbolicArray(new SymbolicUnion());
    } else if (isObject) {
        global = new SymbolicObject();
    } else {
        global = new SymbolicUnion();
    }

    const entry: TypeEntry = { global, local: new Map() };
    typeMap.set(id, entry);
    return entry;
}

/**
 * Gets or creates a local duck type accumulator for a given context key.
 * Mirrors the type of the global accumulator.
 */
export function getOrCreateLocal(
    entry: TypeEntry,
    key: string
): SymbolicClassTypes {
    if (entry.local.has(key)) {
        return entry.local.get(key)!;
    }

    let local: SymbolicClassTypes;
    if (entry.global instanceof SymbolicFunction) {
        local = new SymbolicFunction(entry.global.getFormalParams());
    } else if (entry.global instanceof SymbolicArray) {
        local = new SymbolicArray(new SymbolicUnion());
    } else if (entry.global instanceof SymbolicObject) {
        local = new SymbolicObject();
    } else {
        local = new SymbolicUnion();
    }

    entry.local.set(key, local);
    return local;
}

/**
 * Adds a param observation to all relevant contexts.
 */
export function addParamToContexts(
    entry: TypeEntry,
    callStack: number[],
    symbolId: SymbolId,
    idx: number,
    type: SymbolicType
): void {
    if (!(entry.global instanceof SymbolicFunction)) {
        return;
    }
    entry.global.addParamObservation(idx, type);

    // Add to each prefix of the callStack as a local context
    // e.g. callStack [baz, bar, foo] → local keys "baz", "baz,bar"
    const callers = callStack.filter(id => id !== symbolId);
    const currentCallers = [];
    for (let i = 1; i <= callers.length; i++) {
        currentCallers.push(callers[i-1]);
        const local = getOrCreateLocal(entry, currentCallers.join(","));
        if (local instanceof SymbolicFunction) {
            local.addParamObservation(idx, type);
        }
    }
}

/**
 * Adds a property observation to both global and all relevant local contexts.
 * Per paper: object params also get local types restricted to property
 * accesses during the enclosing function's execution.
 * 
 * Also works for arrays as they are also proxied to monitor element types
 */
export function addPropToContexts(
    entry: TypeEntry,
    callStack: number[],
    symbolId: SymbolId,
    prop: string,
    type: SymbolicType
): void {
    const callers = callStack.filter(id => id !== symbolId);
    const isArray = entry.global instanceof SymbolicArray;
    const isObject = entry.global instanceof SymbolicObject;

    if (!isArray && !isObject) {
        return;
    }

    const applyUpdate = (target: SymbolicClassTypes) => {
        if (isArray && target instanceof SymbolicArray) {
            target.addElement(type);
        } else if (isObject && target instanceof SymbolicObject) {
            target.addProperty(prop, type);
        }
    };

    applyUpdate(entry.global);

    const currentCallers = [];
    for (let i = 1; i <= callers.length; i++) {
        currentCallers.push(callers[i-1]);
        applyUpdate(getOrCreateLocal(entry, currentCallers.join(",")));
    }
}

/**
 * Flattens ScopeMap into a Map mapping SymbolId to SymbolInfo
 */
export function buildSymbolMap(scopeMap: ScopeMap): Map<SymbolId, SymbolInfo> {
    const map = new Map<SymbolId, SymbolInfo>();

    function walk(scope: any): void {
        for (const info of scope.vars.values()) {
            map.set(info.symbolId, info);
        }
        for (const child of scope.children.values()) {
            walk(child);
        }
    }

    walk(scopeMap.root);
    return map;
}

export function initFormalParams(symbolMap: Map<SymbolId, SymbolInfo>, typeMap: TypeMap) {
    for (const [, info] of symbolMap) {
        const node = info.node;
        if (
            node?.type !== "FunctionDeclaration" &&
            node?.type !== "FunctionExpression"
        ) {
            continue;
        }

        const entry = getOrCreate(info.symbolId, node.type, false, false, typeMap);

        if (!(entry.global instanceof SymbolicFunction)) {
            continue;
        }

        entry.global.setFormalParams(
            (node.params ?? []).map(
                (p: { type: string; name?: string }) =>
                    p.type === "Identifier" ? (p.name ?? "undefined") : "undefined"
            )
        );
        
    }
}
