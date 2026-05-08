/* AUTO-GENERATED */
export declare var x: number;
export declare var name: string;
export declare var flag: boolean;
export declare var mixed: (number | string | undefined);
export declare var nullable: null;
export declare var undef: undefined;
export declare var obj: { a: (number | string); b: string; c: (number[] | string); inner?: { a: number } };
export declare var obj1: { a: (number | string); b: string; c: (number[] | string); inner?: { a: number } };
export declare var obj2: { a: (number | string); b: string; c: (number[] | string); inner?: { a: number } };
export declare var obj3: { a: number };
export declare var deep: { a: { b: { c: number } } };
export declare var arr: number[];
export declare var arrMixed: any[];
export declare var arrEmpty: never[];
export declare function Point(x: number, y: number): Point;
interface Point {
  _x: number;
  y: number;
}

export declare function Rect(w: number, h: number): Rect;
interface Rect {
  w: number;
  h: number;
}

export declare var p1: Point;
export declare var r1: Rect;
export declare var r2: Rect;
export declare function Shape(x: undefined): void;
export declare var d: Date;
export declare function area(rect: Rect): number;
export declare function add(a: (number | string), b: (number | string)): (number | string);
export declare function greet(name: string): void;
export declare var msg: string;
export declare function maybeNull(x: number): (null | number);
export declare function g(x: boolean): (number | void);
export declare function makeObj(): undefined;
export declare var made: { x: number; y: number };
export declare function makeAdder(x: number): void;
export declare function uncalled(a: undefined, b: undefined): void;
export declare function formal(a: number, b?: (number | undefined), undefined?: number): void;
export declare function sparse(a: number, b?: undefined, c?: undefined): void;
export declare function foo(a: (boolean | number | string)): void;
export declare function bar(f: (a: number) => void, x: number): void;
export declare var config: { host: string; port: number; debug: boolean };
export declare function connect(opts: { host: string; port: number; debug: boolean }): string;
export declare function baz(fn: (a: string) => void, val: string): void;
export declare function f(a: (null | undefined)): void;
export declare function process(data: { value: number }, count: number): number;
export declare var payload: { value: number };
export declare var addAlias: (a: (number | string), b: (number | string)) => (number | string);
export declare var selfRef: { name: string; self: undefined };
export declare var delObj: { a: (number | undefined); b: number };
export declare function useDel(o: { a?: number; b: number }): undefined;
