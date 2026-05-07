export {};
// ── Primitives ────────────────────────────────────────────────────────────────

var x: number = 42;
var name: string = "hello";
var flag: boolean = false;

// reassignment
x = 100;

// union via reassignment
var mixed: (number | string | undefined);
mixed = 1;
mixed = "hello"; // should infer number | string

// null and undefined
var nullable: null = null;
var undef: undefined;
undef = undefined;

// ── Objects ───────────────────────────────────────────────────────────────────

var obj: { a: (number | string); b: string; c: (number[] | string); inner?: { a: number } } = { a: 1, b: "world", c: [1, 4, 5] };

// property reassignment — should union string | array
obj.c = 'a';

var obj1: { a: (number | string); b: string; c: (number[] | string); inner?: { a: number } } = { a: 2, c: 5 };

// dynamic property access
(obj || obj1).a = 6;

// aliasing
var obj2: { a: (number | string); b: string; c: (number[] | string); inner?: { a: number } } = obj1 = obj;

var obj3: { a: number } = { a: 5 };

// property write with primitive
obj2.a = 'a';

// property write with tracked object ref
obj2.inner = obj3;

// deeply nested object
var deep: { a: { b: { c: number } } } = { a: { b: { c: 1 } } };

// ── Arrays ────────────────────────────────────────────────────────────────────

// homogeneous — should infer number[]
var arr: number[] = [1, 2, 3];

// mixed — should infer Array
var arrMixed: any[] = [1, "hello", false];

// empty — should infer Array
var arrEmpty: never[] = [];

// ── Classes ───────────────────────────────────────────────────────────────────

function Point(this: Point, x: number, y: number) {
    this.x = x;
    this.y = y;
}

// multiple instances — class properties should be intersection
/** @ts-expect-error legacy ES5 constructor */
var p1: Point = new Point(2, 3);
/** @ts-expect-error legacy ES5 constructor */
var p2: Point = new Point(10, 20);

// instance with extra property — should NOT appear in class type (intersection)
function Rect(this: Rect, w: number, h: number) {
    this.w = w;
    this.h = h;
}

/** @ts-expect-error legacy ES5 constructor */
var r1: Rect = new Rect(10, 20);
/** @ts-expect-error legacy ES5 constructor */
var r2: Rect = new Rect(5, 15);
r1.extra = true; // only on r1 — should not appear in Rect class type

var shape = function Shape(x: undefined): void {
    this.x = x;
}

var d: Date = new Date();

// class instance as function parameter
function area(rect: Rect): number {
    return rect.w * rect.h;
}
area(r1);

// ── Functions ─────────────────────────────────────────────────────────────────

// basic with return
function add(a: (number | string), b: (number | string)): (number | string) {
    return a + b;
}
add(1, 2);
add("foo", "bar"); // should union params and return

// void function
function greet(name: string): void {
    var msg = "hello " + name;
}
greet("world");

// null return
function maybeNull(x: number): (null | number) {
    if (x) return x;
    return null;
}
maybeNull(1);
maybeNull(0);

// conditional return — one branch returns, one falls through
function g(x: boolean): (number | void) {
    if (x) return 1;
}
g(true);
g(false);

// function returning object
function makeObj(): undefined {
    return { x: 1, y: 2 };
}
var made: { x: number; y: number } = makeObj();

// function returning another function — returned fn type should be global
function makeAdder(x: number): void {
    return function(y) {
        return x + y;
    };
}
var adder = makeAdder(1);

// never called — should have no param types / void
function uncalled(a: undefined, b: undefined): void {
    return a + b;
}

// extra observed args beyond formal params
function formal(a: number, b?: (number | undefined), undefined?: number): void {}
formal(1);
formal(1, 2, 3); // 3rd arg has no formal param — should appear as undefined: number

// fewer observed args than formal params
function sparse(a: number, b?: undefined, c?: undefined): void {}
sparse(1); // b and c unobserved — should be undefined

function foo(a: (boolean | number | string)): void {}

function bar(f: (a: number) => void, x: number): void {
    f(x);
}

foo(false);
bar(foo, 2);

// object duck typing — only properties accessed during connect matter
var config: { host: string; port: number; debug: boolean } = { host: "localhost", port: 8080, debug: true };

function connect(opts: { host: string; port: number; debug: boolean }): string {
    return opts.host;
}

connect(config);

// recursive duck typing — baz passes foo to nested context
function baz(fn: (a: string) => void, val: string): void {
    fn(val);
}

baz(foo, "recursive");

// ── Edge cases ────────────────────────────────────────────────────────────────

// null and undefined params
function f(a: (null | undefined)): void {}
f(null);
f(undefined);

// function called with object and primitive
function process(data: { value: number }, count: number): number {
    return data.value + count;
}

var payload: { value: number } = { value: 42 };
process(payload, 10);

// aliased function call
var addAlias: (a: (number | string), b: (number | string)) => (number | string) = add;
addAlias(3, 4);

// self-referencing object
var selfRef: { name: string; self: undefined } = { name: "self" };
selfRef.self = selfRef;

// ── deletion / optionality edge case ─────────────────────────────────────────

var delObj: { a: (number | undefined); b: number } = { a: 1, b: 2 };

delObj.a = 3;
delete delObj.a;

// after delete, accessing should behave like optional property
function useDel(o: { a?: number; b: number }): undefined {
    return o.a;
}

useDel(delObj);