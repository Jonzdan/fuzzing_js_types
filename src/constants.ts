/**
 * Table 3.1/3.2, Pg 21-30
 */
export const CATEGORY = {
    primitive: "primitive",
    simple: "simple",
    function: "function",
    array: "array",
    object: "object",
    misc: { // Extensions beyond what's labeled in table
        void: "void",
        union: "union",
        any: "any"
    }
} as const;

export const NUMBER = "number";
export const BIGINT = "bigint";
export const BOOLEAN = "boolean";
export const UNDEFINED = "undefined";
export const NULL = "null";
export const FUNCTION = "function";
export const ARRAY = "array";
export const OBJECT = "object";
export const UNION = "union";
export const VOID = "void";
export const ANY = "any";
export const STRING = "string";

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
    any: ANY
} as const;

export type Kinds = (typeof KIND)[keyof typeof KIND];
export type Categories =
    | "primitive"
    | "simple"
    | "function"
    | "array"
    | "object"
    | "union"
    | "void"
    | "any";

// Note: category simple --> kind string 
export type InferKindAndCategoryOutput = {
    readonly category: Categories;
    readonly kind: Kinds | string;
};

export type KindToString = Exclude<Kinds, typeof KIND.union> | string;

export interface FunctionParam {
    name: string;        
    type: SymbolicType;
}

export type PrimitiveKind = Extract<Kinds,
    | "number"
    | "bigint"
    | "boolean"
    | "string"
    | "undefined"
    | "null">;


interface OptionalType extends InferKindAndCategoryOutput {
    isOptional?: boolean;
}

export interface PrimitiveType extends OptionalType {
    readonly category: "primitive";
    readonly kind: PrimitiveKind;
}

export interface SimpleType extends OptionalType {
    readonly category: "simple";
    readonly kind: string; // classname - paper distinction
    properties: Map<string, SymbolicType>;
}

export interface ArrayType extends OptionalType {
    readonly category: "array";
    readonly kind: "array";
    elementType: SymbolicType;
}

export interface ObjectType extends OptionalType {
    readonly category: "object";
    readonly kind: "object";
    properties: Map<string, SymbolicType>;
}

export interface FunctionType extends OptionalType {
    readonly category: "function";
    readonly kind: "function";
    params: (FunctionParam | undefined)[];
    returnType: SymbolicType;
    isCtor?: boolean;
}

export interface UnionType extends OptionalType {
    readonly category: "union";
    readonly kind: "union";
    members: Set<SymbolicType>;
}

export interface VoidType extends OptionalType {
    readonly category: "void";
    readonly kind: "void";
}

export interface AnyType extends OptionalType {
    readonly category: "any";
    readonly kind: "any";
}

// Final discriminated union

export type SymbolicType =
    | PrimitiveType
    | SimpleType
    | ArrayType
    | ObjectType
    | FunctionType
    | UnionType
    | VoidType
    | AnyType;
