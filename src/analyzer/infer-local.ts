import { CATEGORY, InferKindAndCategoryOutput, KIND } from "../constants";

/**
 * Kind operator detailed in https://scg.unibe.ch/assets/archive/external/JavaScriptTypeInferenceUsingDynamicAnalysisMasterThesis.pdf page 23
 * 
 * Void = not in specification. Does not handle union or classes. Handles a single value
 * 
 * Type localization of single variable -- not final
 */
export function inferKindAndCategory(value: unknown): InferKindAndCategoryOutput {
    /**
     * Separate handler for Array & null since (typeof null/Array) = 'object'
     */
    if (Array.isArray(value)) {
        return {
            isSimple: false,
            kind: KIND.array,
            category: CATEGORY.array
        };
    }
    if (value === null) {
        return {
            isSimple: false,
            kind: KIND.null,
            category: CATEGORY.primitive
        };
    }

    const typeString = typeof value;
    switch (typeString) {
        case "function":
            return {
                isSimple: false,
                kind: KIND.function,
                category: CATEGORY.function
            };
        case "object":
            /**
             * Must be 'simple' objects, since the kind is not Array, Function, or Object
             * E.g., Date object
             */
            return {
                isSimple: true,
                kind: Object.prototype.toString.call(value),
                category: CATEGORY.simple
            };
            
        default:
            return typeString !== "symbol"
                ? {
                    isSimple: false,
                    kind: KIND[typeString],
                    category: CATEGORY.primitive
                }
                : {
                    isSimple: false,
                    kind: KIND.void,
                    category: CATEGORY.void
                };
    }
}
