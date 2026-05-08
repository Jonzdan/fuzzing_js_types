import { SymbolicType } from "src/constants";
import { ScopeMap } from "../trace";
import {
    SymbolicUnion,
    SymbolicFunction,
    SymbolicObject,
} from "../symbolic-types";
import {
    TraceLogFormats,
    TracePropertyNames
} from "../trace";
import { InferCtorParams,
    TypeMap,
    ClassInstances,
    CtorPropTargets,
    FunctionInstances,
    InferPropParams,
    ParamSources,
    DefferedRefProps,
    DeferredFnParams,
    InferEnterParams,
    InferAssignParams,
    InferReturnParams,
    ProcessLogsParams,
    ProcessDeferredRefPropsParams,
    DeferredReturnFns,
    DeferredFnProps
} from "./types";
import { 
    resolveValue,
    addPropToContexts,
    buildSymbolMap,
    initFormalParams,
    addParamToContexts,
    getOrCreate
} from "./utils";

function inferCtor({classInstances, ctorPropTargets, entry: { id, fn }, functionInstances, typeMap }: InferCtorParams) {
    const instanceEntry = typeMap.get(id);
    if (instanceEntry?.global instanceof SymbolicObject && fn) {
        instanceEntry.global.setClass(fn.name);

        if (!classInstances.has(fn.name)) {
            classInstances.set(fn.name, []);
        }
        classInstances.get(fn.name)!.push(instanceEntry.global);
    }

    if (!fn) {
        return;
    }

    const fnEntry = functionInstances.get(fn);
    if (fnEntry?.global instanceof SymbolicFunction) {
        fnEntry.global.setCtor();
        const symbolId = [...typeMap.entries()]
            .find(([, v]) => v === fnEntry)?.[0];

        if (symbolId === undefined) {
            return;
        }

        if (!ctorPropTargets.has(symbolId)) {
            ctorPropTargets.set(symbolId, []);
        }
        ctorPropTargets.get(symbolId)!.push(id);
    }
    
}

function inferProp(
    { 
        entry: {
            id,
            isDeletion,
            isInitial,
            isRead,
            prop,
            callStack,
            refId,
            value
        },
        typeMap,
        functionInstances,
        ctorPropTargets,
        deferredRefProps,
        deferredFnProps,
        paramSources
    }: InferPropParams
) {
    if (isDeletion) {
        const objEntry = typeMap.get(id);
        if (objEntry?.global instanceof SymbolicObject) {
            objEntry.global.markPropertyOptional(prop);
        }
        return;
    }

    // If the value is a tracked object reference, defer resolution to post-pass
    // so we snapshot after all its own prop logs have been processed.
    if (refId) {
        deferredRefProps.push({
            targetId: id,
            callStack,
            prop: prop,
            isOptional: !isInitial && !isRead,
            refId,
        });
        return;
    }

    if (typeof value === "function") {
        deferredFnProps.push({
            targetId: id,
            callStack,
            prop: prop,
            fn: value,
            isOptional: !isInitial && !isRead,
        });
        return;
    }

    const resolved = resolveValue(value, typeMap, functionInstances);
    if (!resolved) {
        return;
    }

    const instanceIds = ctorPropTargets.get(id);
    if (instanceIds) {
        updateInstanceProperties(instanceIds, typeMap, prop, resolved);
        return;
    }

    const objEntry = typeMap.get(id);
    if (!objEntry) {
        return;
    }

    addPropToContexts(objEntry, callStack, id, prop, resolved);
    if (!isInitial && !isRead && objEntry.global instanceof SymbolicObject) {
        objEntry.global.markPropertyOptional(prop);
    }

    const sourceId = paramSources.get(id);
    if (sourceId === undefined) {
        return;
    }
    
    const sourceEntry = typeMap.get(sourceId);
    if (sourceEntry) {
        addPropToContexts(sourceEntry, callStack, sourceId, prop, resolved);
    }
    
}

function inferEnter({ entry: { callStack, args, fn, id }, typeMap, deferredFnParams, functionInstances }: InferEnterParams) {
    const fnEntry = getOrCreate(id, "FunctionDeclaration", false, false, typeMap);
    functionInstances.set(fn, fnEntry);

    args.forEach((arg, idx) => {
        if (typeof arg === "function") {
            const argEntry = functionInstances.get(arg);
            if (argEntry?.global instanceof SymbolicFunction) {
                deferredFnParams.push({ fnEntry, callStack: [...callStack], fnId: id, idx, argEntry });
                return;
            }
        }
        const resolved = resolveValue(arg, typeMap, functionInstances);
        if (!resolved) {
            return;
        }
        
        addParamToContexts(fnEntry, callStack, id, idx, {
            ...resolved,
            ...(fnEntry.global instanceof SymbolicFunction && idx >= fnEntry.global.getFormalParams().length
                ? { isOptional: true }
                : {}
            )
        });
    });

    if (!(fnEntry.global instanceof SymbolicFunction)) {
        return;
    }

    for (let idx = args.length; idx < fnEntry.global.getFormalParams().length; idx++) {
        addParamToContexts(fnEntry, callStack, id, idx, {
            category: "primitive",
            kind: "undefined",
            isOptional: true,
        });
        fnEntry.global.markParamOptional(idx);
    }
}

function inferAssign({ nodeType, entry: {  refId, value, id }, typeMap, functionInstances, deferredReturnFns }: InferAssignParams) {
    if (refId !== undefined) {
        // Alias — point this symbol's type to the ref target
        const refEntry = typeMap.get(refId);
        // If ref is a function, defer until after return fn post-pass
        if (refEntry?.global instanceof SymbolicFunction) {
            deferredReturnFns.push({ 
                kind: "alias",
                targetId: id,
                aliasRefId: refId 
            });
            return;
        }
        if (refEntry) {
            typeMap.set(id, refEntry);
        }
        return;
    }

    if (typeof value === "function") {
        deferredReturnFns.push({
            kind: "assign",
            targetId: id,
            fn: value,
        });
        return;
    }

    const resolved = resolveValue(value, typeMap, functionInstances);
    if (!resolved) {
        return;
    }

    const varEntry = typeMap.get(id);
    if (varEntry?.global instanceof SymbolicUnion) {
        varEntry.global.add(resolved);
    } else if (!varEntry) {
        const newEntry = getOrCreate(id, nodeType, false, resolved instanceof SymbolicObject, typeMap);
        if (newEntry.global instanceof SymbolicUnion) {
            newEntry.global.add(resolved);
        }
    }
}

function inferReturn({entry: { id, value }, functionInstances, typeMap, deferredReturnFns }: InferReturnParams) {
    const fnEntry = typeMap.get(id);
    if (!fnEntry) {
        return;
    }

    if (typeof value === "function") {
        deferredReturnFns.push({
            kind: "return",
            fnEntry,
            fn: value
        });
        
        return;
    }

    const resolved = resolveValue(value, typeMap, functionInstances);
    if (!resolved) {
        return;
    }

    // Return type is always global — duck typing does not apply to return values
    if (fnEntry.global instanceof SymbolicFunction) {
        fnEntry.global.addReturnObservation(resolved);
    }
}

function processLogs({
    ctorPropTargets,
    deferredRefProps,
    entry,
    functionInstances,
    nodeType,
    paramSources,
    typeMap,
    classInstances,
    deferredFnParams,
    deferredReturnFns,
    deferredFnProps,
 }: ProcessLogsParams) {
    switch (entry.type) {
        case TracePropertyNames.create: {
            getOrCreate(entry.id, nodeType, entry.isArray, !entry.isArray, typeMap);
            break;
        }

        case TracePropertyNames.ctor: {
            inferCtor({classInstances, ctorPropTargets, entry, functionInstances, typeMap});
            break;
        }

        case TracePropertyNames.prop: {
            inferProp({
                entry,
                ctorPropTargets,
                deferredRefProps,
                functionInstances,
                paramSources,
                typeMap,
                deferredFnProps
            });
            break;
        }

        case TracePropertyNames.enter: {
            inferEnter({
                entry,
                deferredFnParams,
                functionInstances,
                typeMap
            });
            break;
        }

        case TracePropertyNames.returning: {
            inferReturn({
                entry,
                functionInstances,
                typeMap,
                deferredReturnFns,
            });
            break;
        }

        case TracePropertyNames.exit: {
            const fnEntry = typeMap.get(entry.id);
            if (fnEntry?.global instanceof SymbolicFunction) {
                fnEntry.global.addReturnObservation({ category: "void", kind: "void" });
            }
            break;
        }

        case TracePropertyNames.assign: {
            inferAssign({
                entry,
                functionInstances,
                nodeType,
                deferredReturnFns,
                typeMap
            });
            break;
        }
    }
}

function updateInstanceProperties(instanceIds: number[], typeMap: TypeMap, prop: string, resolved: SymbolicType) {
    instanceIds.forEach((instanceId) => {
        const instanceEntry = typeMap.get(instanceId);
        if (instanceEntry?.global instanceof SymbolicObject) {
            instanceEntry.global.addProperty(prop, resolved);
        }
    });
}

/**
 * Updates SymbolicType(s) with finalized prop information (shape) 
 */
function processDeferredRefProps({ ctorPropTargets, deferredRefProps, typeMap }: ProcessDeferredRefPropsParams) {
    for (const { targetId, callStack, isOptional, prop, refId } of deferredRefProps) {
        if (refId === targetId) {
            const objEntry = typeMap.get(targetId);
            if (objEntry) {
                addPropToContexts(objEntry, callStack, targetId, prop, { category: "primitive", kind: "undefined" });
            }
            continue;
        }

        const refEntry = typeMap.get(refId);
        if (!refEntry) {
            continue;
        }
        const resolved = refEntry.global.build();

        const instanceIds = ctorPropTargets.get(targetId);
        if (instanceIds) {
            updateInstanceProperties(instanceIds, typeMap, prop, resolved);
            continue;
        }

        const objEntry = typeMap.get(targetId);
        if (!objEntry) {
            continue;
        }
        addPropToContexts(objEntry, callStack, targetId, prop, resolved);
        if (isOptional && objEntry.global instanceof SymbolicObject) {
            objEntry.global.markPropertyOptional(prop);
        }
    }
}

function processDeferredFnParams(deferredFnParams: DeferredFnParams) {
    for (const { fnEntry, callStack, fnId, idx, argEntry } of deferredFnParams) {
        let narrowed: SymbolicType | undefined;
        for (let i = callStack.length; i >= 1; i--) {
            const key = callStack.slice(0, i).join(",");
            const local = argEntry.local.get(key);
            if (local) {
                narrowed = local.build();
                break;
            }
        }

        addParamToContexts(
            fnEntry,
            callStack.slice(0, -1),
            fnId,
            idx, 
            narrowed ?? argEntry.global.build()
        );
    }
}

/**
 * First instance for each class is the intersection of all types
 */
function computeClassPropertyIntersection(classInstances: ClassInstances, typeMap: TypeMap) {
    for (const [_className, instances] of classInstances) {
        if (instances.length <= 1) {
            continue;
        }

        const [first, ...rest] = instances;
        for (const other of rest) {
            first!.intersectWith(other);
        }
        const firstId = [...typeMap.entries()]
            .find(([, e]) => e.global === first)?.[0];
        
        if (firstId === undefined) {
            continue;
        }

        const restSet = new Set(rest);
        for (const [id, entry] of typeMap) {
            if (!(entry.global instanceof SymbolicObject)) {
                continue;
            }

            if (!restSet.has(entry.global)) {
                continue;
            }

            typeMap.set(id, typeMap.get(firstId)!);
        }
        
    }
}

function handleReturnAlias(deferredReturnFns: DeferredReturnFns, functionInstances: FunctionInstances, typeMap: TypeMap) {
    for (const deferred of deferredReturnFns) {
        switch (deferred.kind) {
            case "return": {
                const returnedEntry = functionInstances.get(deferred.fn);
                if (!returnedEntry) {
                    break;
                }
                if (deferred.fnEntry.global instanceof SymbolicFunction) {
                    deferred.fnEntry.global.addReturnObservation(returnedEntry.global.build());
                }
                break;
            }
            case "assign": {
                const returnedEntry = functionInstances.get(deferred.fn);
                if (!returnedEntry) {
                    break
                }
                
                const existing = typeMap.get(deferred.targetId);
                if (existing?.global instanceof SymbolicUnion) {
                    existing.global.add(returnedEntry.global.build());
                } else {
                    typeMap.set(deferred.targetId, returnedEntry);
                }
                break;
            }
            case "alias": {
                const refEntry = typeMap.get(deferred.aliasRefId);
                if (refEntry) typeMap.set(deferred.targetId, refEntry);
                break;
            }
        }
    }
}

function processDeferredFnProps(deferredFnProps: DeferredFnProps, functionInstances: FunctionInstances, typeMap: TypeMap) {
    for (const { targetId, callStack, prop, fn, isOptional } of deferredFnProps) {
        const fnEntry = functionInstances.get(fn);
        if (!fnEntry) {
            continue;
        }
        const resolved = fnEntry.global.build();
        const objEntry = typeMap.get(targetId);

        if (!objEntry) {
            continue;
        }
        addPropToContexts(objEntry, callStack, targetId, prop, resolved);
        if (isOptional && objEntry.global instanceof SymbolicObject) {
            objEntry.global.markPropertyOptional(prop);
        }
    }
}

/**
 * Single-pass incremental inference over the trace log.
 * Builds up symbolic types per symbol id, then does a post-pass
 * to attach formal param names and handle class property intersection.
 */
export function inferTypes(logs: TraceLogFormats[], scopeMap: ScopeMap): { typeMap: TypeMap, classInstances: ClassInstances }  {
    const typeMap: TypeMap = new Map();
    const symbolMap = buildSymbolMap(scopeMap);
    const classInstances: ClassInstances = new Map();
    const ctorPropTargets: CtorPropTargets = new Map();
    const paramSources: ParamSources = new Map();
    const functionInstances: FunctionInstances = new Map();
    const deferredRefProps: DefferedRefProps = [];
    const deferredFnParams: DeferredFnParams = [];
    const deferredReturnFns: DeferredReturnFns = [];
    const deferredFnProps: DeferredFnProps = [];
    initFormalParams(symbolMap, typeMap);

    logs.forEach((entry) => {
        const info = symbolMap.get(entry.id);
        const nodeType = info?.node?.type;

        processLogs({
            classInstances,
            ctorPropTargets,
            deferredFnProps,
            deferredFnParams,
            deferredRefProps,
            deferredReturnFns,
            entry,
            functionInstances,
            nodeType,
            paramSources,
            typeMap
        });
    });
    let prevResult = -1;
    let iterations = 0;
    const MAX_ITER = 10;

    while (iterations++ < MAX_ITER) {
        handleReturnAlias(deferredReturnFns, functionInstances, typeMap);
        processDeferredFnProps(deferredFnProps, functionInstances, typeMap);
        processDeferredFnParams(deferredFnParams);
        processDeferredRefProps({ ctorPropTargets, deferredRefProps, typeMap });

        const currentResult = [...typeMap.values()]
            .map(e => e.global.toString())
            .join("")
            .length;
        
        if (currentResult === prevResult) {
            break;
        }
        prevResult = currentResult;
    }

    computeClassPropertyIntersection(classInstances, typeMap);

    // 4. Filter to globals only
    // for (const [id, _] of typeMap) {
    //     const info = symbolMap.get(id);
    //     const entry = typeMap.get(id)!;
    //     if (info && !info.isGlobal && !(entry.global instanceof SymbolicFunction)) {
    //         typeMap.delete(id);
    //     }
    // }

    return { typeMap, classInstances };
}
