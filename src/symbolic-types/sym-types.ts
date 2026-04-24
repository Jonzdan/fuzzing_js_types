import { CategoryKindType, KindToString } from "src/constants";
import { typesEqual, setSome } from "./util";

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

    // Flatten any nested unions
    static flattenUnion(members: Set<CategoryKindType>): Set<CategoryKindType> {
        let outputMembers = new Set<CategoryKindType>()

        if (!members.size) {
            return outputMembers;
        }

        for (const { category, members: childMembers } of members) {
            if (!childMembers) {
                continue;
            }

            outputMembers = outputMembers.union(
                category === "union"
                    ? this.flattenUnion(childMembers)
                    : members
            );
        }

        return outputMembers;
    }

    /**
     * Mainly for complex objects (compared with reference equality)
     * @param observed
     * @returns 
     */
    static dedupUnion(members: Set<CategoryKindType>): Set<CategoryKindType> {
        const outputMembers = new Set<CategoryKindType>();
        for (const t of members) {
            if (!setSome(outputMembers, t, (t1, t2) => typesEqual(t1, t2))) {
                outputMembers.add(t);
            }
        }

        return outputMembers;
    }

    /**
     * Only merges/unions types (doesn't care about anything else)
     * @param observed
     * @param other 
     */
    static mergeUnions(observed: CategoryKindType[], other: CategoryKindType[]) {
        const union = new Set<CategoryKindType>();

        observed.forEach((type) => {
            if (type.category === "union") {
                union.union(
                    this.flattenUnion(type.members || new Set())
                )
            } else {
                union.add(type);
            }
        });

        other.forEach((type) => {
            if (type.category === "union") {
                union.union(
                    this.flattenUnion(type.members || new Set())
                )
            } else {
                union.add(type);
            }
        });

        return {
            category: "union",
            kind: "union",
            members: this.dedupUnion(union)
        };
    }

    build(): CategoryKindType {
        if (this.observed.length === 0) {
            return {
                category: "void",
                kind: "void",
            };
        }
 
        // Flatten any nested unions. Should not be more than 1 depth deep
        const flat: CategoryKindType[] = this.observed.flatMap(type => 
            type.kind === "union"
                ? [...SymbolicUnion.flattenUnion(type.members!)]
                : [type]
        );
    
        // Deduplicate by structural equality -- revisit... should maybe use existing dedup method?
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