/**
 * From paper on type inference impl:
 * "Analyze Module
    Type inference is implemented in the Analyze module. It uses the SymbolicTypes sub module
    to model the type system. Type inference takes as input the trace log and the ScopeMap created
    during instrumentation. The main functionality is implemented in the inferTypes method. It
    works by iterating over the symbols defined in the ScopeMap and, depending on the node type,
    calls the method responsible for inferring the symbol type."
 * 
 * 
 * 4 Methods are called:
 * - getValueType, getPrototypeName, getFunctionType, getObjectValue
 * - On Page 44 in paper
 * 
 * 
 * Trace log is used similiarly in paper as current impl (as separate step before doing inference)
 * - However, it generates symbolic types beyond 'kind' operator (what currently exists)
 * 
 * Scope-map details:
 * - identifiers to information about AST nodes. E.g. global/non-global, name, ...
 * - We'll add specifically file location
 * - TODO: see if jalangi already inserts file location. If not, use AST tools detailed in Page 41, Section 5.1
 *     - Esprima, Estraverse
 * 
 * Output type map details:
 * - maps symbol identifiers (iid) to inferred types
 * - "support operations such as building sparse union types, adding function
        parameters, setting functions as constructors and setting objects as classes"
 * 
 * 
 */

import { Kinds, KIND } from "../constants";
import { inferKindAndCategory } from "./infer-local";

/**
 * From the Odgaard et al.:
 * "Type inference takes as input the trace log and the ScopeMap created
 * during instrumentation. The main functionality is implemented in the inferTypes method. It
 * works by iterating over the symbols defined in the ScopeMap and, depending on the node type,
 * calls the method responsible for inferring the symbol type."
 * 
 * Should call the below infer methods after determination. Based on Table 5.1's methods for type inference
 * 
 * Note: Page 44 mentions recurisve breakpoint to avoid infinite loops 
 * 
 * TODO: define ScopeMap type
 * 
 * @param traceLog 
 * @param ScopeMap
 * @returns a type map storing 
 */
export function inferTypes(/* traceLog: unknown, ScopeMap: unknown */) {
    
}


/**
 * Only if union types are equal are they collapsed. Recursive search to collapse.
 * infer functions are called to generate actual type definitions.
 * E.g. narrow unions, define formal function parameters, figure out constructors
 */
export function inferUnionType(values: unknown[]): (keyof Kinds | string)[] {
    if (!values.length) {
        return [KIND.void];
    }

    return [...new Set(values.map((value) => {
        const { kind, isSimple } = inferKindAndCategory(value);
        return isSimple
            ? kind
            : KIND[kind]
    }))
    ];
}

export function inferFunctionType() {}

export function inferArrayType() {}

/**
 * Not a simple object, array, or function
 * @param {*} values 
 */
export function inferObjectType() {}
export function inferConstructorType() {}
export function inferClassType() {}
export function inferClassPropertyType() {}
export function inferDuckType() {}