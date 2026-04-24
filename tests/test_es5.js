// primitives
var x = 42;
var name = "hello";
var flag = false;

// reassignment
x = 100;

// object literal
var obj = { a: 1, b: "world" };

var obj1 = { a: 2, c: 5};

(obj || obj1).a = 6;

var obj2 = obj1 = obj;

var obj3 = { a: 5 };

obj2.a = 'a';

obj2.inner = obj3;

// array
var arr = [1, 2, 3];

// constructor / class pattern
function Point(x, y) {
    this.x = x;
    this.y = y;
}

var p = new Point(2, 3);

// plain function
function add(a, b) {
    return a + b;
}

add(1, 2);
add("foo", "bar");

// duck typing scenario from the paper:
// foo is called globally with a boolean, and also via bar with a number.
// duck type inference should see foo's local type inside bar as fn(number) -> void
function foo(a) {}

function bar(f, x) {
    f(x);
}

foo(false);
bar(foo, 2);