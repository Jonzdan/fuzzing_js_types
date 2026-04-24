import { CategoryKindType, Kinds, KindToString } from "src/constants";
import { typesEqual } from "./util";

interface SymbolicTypeBuildable {
    build(): CategoryKindType;
    toString(): string;
}

/**
 * 
 * Called after infer functions... (models types, doesn't infer type.)
 * Is a union accumulator -- essentially base model for symbolic types module
 * 
 * constructor()
 * add()
 * build()
 * toString()
 */
export class SymbolicUnion implements SymbolicTypeBuildable {
    private readonly observed: CategoryKindType[];

    constructor(observed: CategoryKindType[] = []) {
        this.observed = observed;
    }

    add(type: CategoryKindType): void {
        if (this.observed.some(t => typesEqual(t, type))) {
            return;
        }

        this.observed.push(type);
    }

    
    static mergeUnionTypes(observed: CategoryKindType[], other: CategoryKindType[]) {

    }

    private mergeUnion() {
        
    }

    build(): CategoryKindType {
        if (this.observed.length === 0) {
            return {
                category: "void",
                kind: "void",
            };
        }
 
        // Flatten any nested unions
        const flat: CategoryKindType[] = this.observed.flatMap(type => 
            type.kind === "union"
                ? [...type.members!]
                : [type]
        );
    
        // Deduplicate by structural equality. Can occur again after flattening nested unions
        const deduped: CategoryKindType[] = [];
        for (const t of flat) {
            if (!deduped.some(existing => typesEqual(existing, t))) {
                deduped.push(t);
            }
        }
    
        if (deduped.length === 1) {
            return deduped[0]!;
        }

        return { category: "union", kind: "union", members: new Set(deduped) };
    }

    toString(): KindToString {
        const { members } = this.build();
        if (!members) {
            return '';
        }

        return `(${[...members].join('|')})`;
        
    }

}

export class SymbolicArray {

}

export class SymbolicFunction {

}

export class SymbolicObject {

}