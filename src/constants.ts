/**
 * Table 3.1/3.2, Pg 21-30
 */
export const CATEGORY = Object.freeze({
    primitive: "primitive",
    simple: "simple",
    function: "function",
    array: "array",
    object: "object",
    void: "void"
});

export const NUMBER = "number";
export const BIGINT = "bigint";
export const BOOLEAN = "boolean";
export const STRING = "string";
export const UNDEFINED = "undefined";
export const NULL = "null";
export const FUNCTION = "function";
export const ARRAY = "array";
export const OBJECT = "object";
export const UNION = "union";
export const VOID = "void";

export const KIND = {
    number: NUMBER,
    bigint: BIGINT,
    boolean: BOOLEAN,
    string: STRING,
    undefined: UNDEFINED,
    null: NULL,
    function: FUNCTION,
    array: ARRAY,
    object: OBJECT,
    union: UNION,
    void: VOID,
} as const;

export type Kinds = typeof KIND;
export type Categories = typeof CATEGORY;

interface InferKindAndCategorySimpleOutput {
    readonly isSimple: true;
    readonly category: keyof Categories;
    readonly kind: string;
}

interface InferKindAndCategoryKindOutput {
    readonly isSimple: false;
    readonly category: keyof Categories;
    readonly kind: keyof Kinds;
}

export type InferKindAndCategoryOutput = InferKindAndCategoryKindOutput | InferKindAndCategorySimpleOutput; 


/**
 * Trace Log Entry Names
 * Table 3.3, Page 31 of Paper
 */
export const TraceLogEntries = {
    var_assign: "assign",
    func_enter: "enter",
    func_exit: "returning",
    obj_create: "create",
    obj_ctor: "ctor",
    obj_prop: "prop"
} as const;
