// ── Primitives ────────────────────────────────────────────────────────────────

var x = 42;
var name = "hello";
var flag = false;

// reassignment
x = 100;

// union via reassignment
var mixed;
mixed = 1;
mixed = "hello"; // should infer number | string

// null and undefined
var nullable = null;
var undef;
undef = undefined;

// ── Objects ───────────────────────────────────────────────────────────────────

var obj = { a: 1, b: "world", c: [1, 4, 5] };

// property reassignment — should union string | array
obj.c = 'a';

var obj1 = { a: 2, c: 5 };

// dynamic property access
(obj || obj1).a = 6;

// aliasing
var obj2 = obj1 = obj;

var obj3 = { a: 5 };

// property write with primitive
obj2.a = 'a';

// property write with tracked object ref
obj2.inner = obj3;

// deeply nested object
var deep = { a: { b: { c: 1 } } };

// ── Arrays ────────────────────────────────────────────────────────────────────

// homogeneous — should infer number[]
var arr = [1, 2, 3];

// mixed — should infer Array
var arrMixed = [1, "hello", false];

// empty — should infer Array
var arrEmpty = [];

// ── Classes ───────────────────────────────────────────────────────────────────

function Point(x, y) {
    this._x = x;
    this.y = y;
}

// multiple instances — class properties should be intersection

// instance with extra property — should NOT appear in class type (intersection)
function Rect(w, h) {
    var p1 = new Point(2, 3);
    this.w = w;
    this.h = h;
}

var r1 = new Rect(10, 20);
var r2 = new Rect(5, 15);
r1.extra = true; // only on r1 — should not appear in Rect class type

var shape = function Shape(x) {
    this.x = x;
}

var d = new Date();

// class instance as function parameter
function area(rect) {
    return rect.w * rect.h;
}
area(r1);

// ── Functions ─────────────────────────────────────────────────────────────────

// basic with return
function add(a, b) {
    return a + b;
}
add(1, 2);
add("foo", "bar"); // should union params and return

// void function
function greet(name) {
    var msg = "hello " + name;
}
greet("world");

// null return
function maybeNull(x) {
    if (x) return x;
    return null;
}
maybeNull(1);
maybeNull(0);

// conditional return — one branch returns, one falls through
function g(x) {
    if (x) return 1;
}
g(true);
g(false);

// function returning object
function makeObj() {
    return { x: 1, y: 2 };
}
var made = makeObj();

// function returning another function — returned fn type should be global
function makeAdder(x) {
    return function(y) {
        return x + y;
    };
}
var adder = makeAdder(1);

// never called — should have no param types / void
function uncalled(a, b) {
    return a + b;
}

// extra observed args beyond formal params
function formal(a, b) {}
formal(1);
formal(1, 2, 3); // 3rd arg has no formal param — should appear as undefined: number

// fewer observed args than formal params
function sparse(a, b, c) {}
sparse(1); // b and c unobserved — should be undefined

function foo(a) {}

function bar(f, x) {
    f(x);
}

foo(false);
bar(foo, 2);

// object duck typing — only properties accessed during connect matter
var config = { host: "localhost", port: 8080, debug: true };

function connect(opts) {
    return opts.host;
}

connect(config);

// recursive duck typing — baz passes foo to nested context
function baz(fn, val) {
    fn(val);
}

baz(foo, "recursive");

// ── Edge cases ────────────────────────────────────────────────────────────────

// null and undefined params
function f(a) {}
f(null);
f(undefined);

// function called with object and primitive
function process(data, count) {
    return data.value + count;
}

var payload = { value: 42 };
process(payload, 10);

// aliased function call
var addAlias = add;
addAlias(3, 4);

// self-referencing object
var selfRef = { name: "self" };
selfRef.self = selfRef;

// ── deletion / optionality edge case ─────────────────────────────────────────

var delObj = { a: 1, b: 2 };

delObj.a = 3;
delete delObj.a;

// after delete, accessing should behave like optional property
function useDel(o) {
    return o.a;
}

useDel(delObj);