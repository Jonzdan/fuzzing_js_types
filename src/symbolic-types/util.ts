import { ArrayType, SymbolicType, FunctionType, ObjectType, SimpleType, UnionType } from "src/constants";

/**
 * Structural equality check for SymbolicType.
 * Per paper: union collapses only if types are identical.
 */
export function typesEqual(a: SymbolicType | undefined, b: SymbolicType | undefined): boolean { 
    if (!a || !b || a.category !== b.category) {
        return false;
    }
    
    switch (a.category) {
        case "primitive":
            return a.kind === b.kind;
 
        case "any":
            return b.category === "any";

        case "void":
            return b.category === "void";
 
        case "array": {
            return typesEqual(a.elementType, (b as ArrayType).elementType);
        }
 
        case "object": {
            b = b as ObjectType;
            if (a.properties.size !== b.properties.size) {
                return false;
            }

            for (const [key, val] of a.properties) {
                const other = b.properties.get(key);
                if (!other || !typesEqual(val, other)) {
                    return false;
                }
            }
            return true;
        }
 
        case "function": {
            const functionB = b as FunctionType;
            if (a.isCtor !== functionB.isCtor) {
                return false;
            }

            if (a.params?.length !== functionB.params?.length) {
                return false;
            }

            if (!typesEqual(a.returnType, functionB.returnType)) {
                return false;
            }

            return a.params.every((p, i) =>
                p?.name === functionB.params?.[i]?.name &&
                typesEqual(p?.type, functionB.params?.[i]?.type)
            );
        }
 
        case "simple": {
            b = b as SimpleType;
            if (a.kind !== b.kind) {
                return false;
            }

            if (a.properties.size !== b.properties.size) {
                return false;
            }
            
            for (const [key, val] of a.properties) {
                const other = b.properties.get(key);
                if (!other || !typesEqual(val, other)) {
                    return false;
                }
            }
            return true;
        }
 
        case "union": {
            const unionB = b as UnionType;
            if (a.members?.size !== unionB.members?.size) {
                return false;
            }

            return [...a.members].every(m => setSome(unionB.members, m, typesEqual));
        }
    }
}

export function setSome<T>(set: Set<T>, element: T, predicate: (...args: T[]) => boolean): boolean {
    for (const member of set) {
        if (predicate(member, element)) {
            return true;
        }
    }
    return false;
}
