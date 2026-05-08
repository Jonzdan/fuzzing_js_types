import { ArrayType, SymbolicType, FunctionType, KindToString, ObjectType, SimpleType } from "src/constants";
import { typesEqual } from "./util";

interface SymbolicBuildable {
    /**
     * For code generation step -- mainly serialization in a sense to a common shared type  
     * Used by Symbolic Types mainly for recursive structural building of types 
     */
    build(): SymbolicType;
    /**
     * Used primarily to format symbolic class properties into typescript types 
     */
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
export class SymbolicUnion implements SymbolicBuildable {
    private readonly observed: SymbolicType[];

    constructor(observed: SymbolicType[] = []) {
        this.observed = observed;
    }

    add(type: SymbolicType): void {
        if (this.observed.some(t => typesEqual(t, type))) {
            return;
        }

        this.observed.push(type);
    }

    /**
     * Since all other symbolic types are based off symbolic union, optionality is exposed here  
     * Should allow for incremental buliding out of recursive union types (primarily for object types)
     */
    updateOptionality(type: SymbolicType, value: boolean) {
        for (let i = 0; i < this.observed.length; i++) {
            if (!typesEqual(type, this.observed[i])) {
                continue;
            }

            this.observed[i]!.isOptional = value;
        }
    }

    private flattenUnion(types: SymbolicType[]): SymbolicType[] {
        return types.flatMap((type) => {
            return (type.category === "union")
                ? this.flattenUnion([...type.members])
                : type;
        });
    }

    build(): SymbolicType {
        if (this.observed.length === 0) {
            return {
                category: "void",
                kind: "void",
            };
        }
 
        const flat: SymbolicType[] = this.observed.flatMap(type => 
            type.category === "union" && type.kind === "union"
                ? this.flattenUnion([...type.members])
                : [type]
        );

        const deduped: SymbolicType[] = [];
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
        return typeToString(this.build());
    }

}

/**
 * Takes in a union of size 0-n. Outputs a SymbolicType with elementType = ... (what designates it an array)
 */
export class SymbolicArray implements SymbolicBuildable {
    private types: SymbolicUnion;

    constructor(types?: SymbolicUnion) {
        this.types = types || new SymbolicUnion();
    }

    addElement(type: SymbolicType): void {
        this.types.add(type);
    }

    build(): ArrayType {
        const output = this.types.build();

        return {
            category: "array",
            kind: "array",
            elementType: (output.category === "union" && (!output.members || output.members.size > 1))
                ? { kind: "any", category: "any" }
                : output
        };
    }

    toString(): KindToString {
        const { elementType } = this.build();
        if (!elementType) {
            return '[]';
        }

        return `${elementType.kind === "void" ? 'never' : elementType.kind}[]`;
    }
}

export class SymbolicFunction implements SymbolicBuildable {
    private params: SymbolicUnion[];
    private returnType: SymbolicUnion;
    private formalParams: string[];
    private isCtor: boolean;
    private optionalParams: Set<number>;

    constructor(formalParams?: string[], params?: SymbolicUnion[], returnType?: SymbolicUnion, isCtor?: boolean) {
        this.params = params || [];
        this.returnType = returnType || new SymbolicUnion();
        this.isCtor = isCtor || false;
        this.formalParams = formalParams || [];
        this.optionalParams = new Set();
    }

    addParamObservation(index: number, param: SymbolicType): void {
        if (!this.params[index]) {
            this.params[index] = new SymbolicUnion();
        }
        this.params[index]!.add(param);
    }

    addReturnObservation(type: SymbolicType): void {
        this.returnType.add(type);
    }

    setReturnType(returnType: SymbolicUnion): void {
        this.returnType = returnType;
    }

    markParamOptional(index: number): void {
        this.optionalParams.add(index);
    }

    isParamOptional(index: number): boolean {
        return this.optionalParams.has(index) || !!(this.params[index] || new SymbolicUnion()).build().isOptional;
    }

    setFormalParams(params: string[]): void {
        this.formalParams = params;
    }

    getFormalParams(): string[] {
        return [...this.formalParams];
    }

    setCtor(): void {
        this.isCtor = true;
    }

    /**
     * m = # of formal Params, M = observed params
     * 
     * if m < M --> undefined: type_M+k
     * if m > M --> p_m: undefined 
     */
    build(): FunctionType {
        const params = [];
        for (let i = 0; i < this.formalParams.length; i++) {
            params.push({
                name: this.formalParams[i] ?? `param${i}`,
                type:
                    this.params[i]?.build() ?? {
                        category: "primitive",
                        kind: "undefined",
                    }
            });
        }

        for (let i = this.formalParams.length; i < this.params.length; i++ ) {
            params.push({
                name: "undefined",
                type: this.params[i]?.build() ?? {
                    category: "primitive",
                    kind: "undefined",
                },
            });
        }

        return {
            category: "function",
            kind: "function",
            params,
            returnType: this.returnType.build(),
            isCtor: this.isCtor
        };
    }

    toString(): string {
        const params: string[] = [];

        for (let i = 0; i < this.formalParams.length; i++) {
            params.push(
                `${this.formalParams[i] ?? `param${i}`}${this.optionalParams.has(i) ? "?" : ''}: ${
                    this.params[i] 
                        ? this.params[i]?.toString()
                        : "undefined"
                }`
            );
        }

        for (let i = this.formalParams.length; i < this.params.length; i++) {
            params.push(
                `undefined?: ${this.params[i]!.toString()}`
            );
        }

        return `(${params.join(", ")}) => ${this.returnType.toString()}`;
    }

}

export class SymbolicObject implements SymbolicBuildable {
    protected readonly properties: Map<string, SymbolicUnion>;
    protected className: string;
    
    constructor(properties?: Map<string, SymbolicUnion>, className?: string) {
        this.properties = properties || new Map();
        this.className = className || '';
    }

    addProperty(propertyName: string, type: SymbolicType): void {
        if (!this.properties.has(propertyName)) {
            this.properties.set(propertyName, new SymbolicUnion())
        }
        this.properties.get(propertyName)!.add(type);
    }

    /**
     * In-place mutation of this.properties to reflect elements only in both types
     */
    intersectWith(other: SymbolicObject): void {
        for (const key of this.properties.keys()) {
            if (!other.properties.has(key)) {
                this.properties.delete(key);
            }
        }
        for (const [key, union] of other.properties) {
            if (this.properties.has(key)) {
                this.properties.get(key)!.add(union.build());
            }
        }
    }

    getProperties(): Map<string, SymbolicUnion> {
        return new Map<string, SymbolicUnion>(this.properties);
    }

    markPropertyOptional(propertyName: string): void {
        const union = this.properties.get(propertyName);
        if (union) {
            union.updateOptionality(union.build(), true);
        }
    }

    getClass(): string {
        return this.className;
    }

    setClass(className: string): void {
        this.className = className;
    }

    build(): ObjectType | SimpleType {
        return {
            ...(
                !this.className ? {
                    category: "object",
                    kind: "object"
                } : {
                    category: "simple",
                    kind: this.className
                }
            ),
            properties: new Map([...this.properties].map(([key, symUnion]) => {
                return [
                    key,
                    symUnion.build()
                ];
            })),
        };
    }

    toString(): string {
        if (this.className) {
            return this.className;
        }
        
        return typeToString(this.build());
    }
}

export function typeToString(type: SymbolicType): string {
    switch (type.category) {
        case "primitive":
        case "void":
        case "any":
            return type.kind;

        case "array":
            return type.elementType
                ? `${typeToString(type.elementType)}[]`
                : "Array";

        case "object":
            if (!type.properties || type.properties.size === 0) {
                return "{}";
            }

            return `{ ${[...type.properties.entries()]
                .map(([k, v]) => `${k}${v.isOptional ? '?' : ''}: ${typeToString(v)}`)
                .join("; ")} }`;

        case "simple":
            return type.kind ?? "object";

        case "function": {
            return `(${(type.params ?? [])
                .map(p => `${p?.name ?? "undefined"}: ${typeToString(p?.type ?? { category: "void", kind: "void" })}`)
                .join(", ")}) => ${typeToString(type.returnType)}`;
        }

        case "union":
            return `(${[...type.members]
                .map((value) => typeToString(value))
                .sort()
                .join(" | ")})`;
    }
}

export type SymbolicClassTypes = SymbolicArray | SymbolicFunction | SymbolicObject | SymbolicUnion;
