/**
 * Table 3.1/3.2, Pg 21-30
 */
export const CATEGORY = {
    primitive: "primitive",
    simple: "simple",
    function: "function",
    array: "array",
    object: "object",
    misc: {
        void: "void",
        union: "union",
    }
} as const;

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
    readonly category: Categories["simple"];
    readonly kind: string;
}

// Fix being string\
type Category = keyof typeof CategoryKindMap;

type KindFor<C extends Category> =
  (typeof CategoryKindMap)[C][number];

export type CategoryKeyWithoutSimple = Exclude<Category, "simple">;

type InferKindAndCategoryKindOutput<C extends Category = Category> = {
    readonly category: C;
    readonly kind: KindFor<C>;
};

export type KindToString = keyof Omit<Kinds, typeof KIND.union> | string;

export type InferKindAndCategoryOutput<C extends Category> = InferKindAndCategoryKindOutput<C> | InferKindAndCategorySimpleOutput;

interface FunctionParam {
    name: string;        
    type: CategoryKindType;
}

export type CategoryKindType = InferKindAndCategoryKindOutput & {
    isOptional?: boolean;
    elementType?: CategoryKindType | null;                  // array
    properties?: Map<string, CategoryKindType>;             // object/class
    className?: string;                                     // class
    params?: (FunctionParam | undefined)[];                 // function
    returnType?: CategoryKindType;                          // function
    isCtor?: boolean;                                       // function
    members?: Set<CategoryKindType>;                           // union
};

// Maps deps
export const CategoryKindMap = {
    [CATEGORY.primitive]: [KIND.bigint, KIND.boolean, KIND.null, KIND.number, KIND.string, KIND.undefined],
    [CATEGORY.array]: [KIND.array],
    [CATEGORY.function]: [KIND.function],
    [CATEGORY.simple]: [KIND.object],  // should be class, not a kind not defined in table -- add?
    [CATEGORY.object]: [KIND.object],
    [CATEGORY.misc.union]: [KIND.union],
    [CATEGORY.misc.void]: [KIND.void],
} as const;


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
