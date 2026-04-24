import { CategoryKindType } from "src/constants";

/**
 * Structural equality check for SymbolicType.
 * Per paper: union collapses only if types are identical.
 */
export function typesEqual(a: CategoryKindType | undefined, b: CategoryKindType | undefined): boolean { 
    if (!a || !b) {
        return false;
    }
    
    switch (a.category) {
        case "primitive":
            return a.kind === b.kind;
 
        case "void":
            return true;
 
        case "array": {
            if (a.elementType === null && b.elementType === null) {
                return true;
            }
            if (a.elementType === null || b.elementType === null) {
                return false;
            }
            return typesEqual(a.elementType, b.elementType);
        }
 
        case "object": {
            if (!a.properties || !b.properties || a.properties.size !== b.properties.size) {
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
            if (a.isCtor !== b.isCtor) {
                return false;
            }

            if (!a.params || !b.params || a.params?.length !== b.params?.length) {
                return false;
            }

            if (!typesEqual(a.returnType, b.returnType)) {
                return false;
            }

            return a.params.every((p, i) =>
                p?.name === b.params?.[i]?.name &&
                typesEqual(p?.type, b.params?.[i]?.type)
            );
        }
 
        case "simple": {
            if (!a.className || !b.className) {
                return false;
            }

            if (!a.properties || !b.properties ||  a.properties.size !== b.properties.size) {
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
            if (a.members?.size !== b.members?.size) {
                return false;
            }

            return a.members?.difference(b.members || new Set()).size === 0;
        }
    }
}