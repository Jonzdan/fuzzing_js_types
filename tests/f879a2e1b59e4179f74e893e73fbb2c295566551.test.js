const { Trace } = require("../dist/src/trace/trace.js");
const mod = { exports: {} };
const fs = require("fs");
const code = fs.readFileSync(require("path").join(__dirname, "../seeds/instrumented_signals.js"), "utf8");
eval(`(function(module, exports, require, Trace) { ${code} })`)(mod, mod.exports, require, Trace, {});
const signals = mod.exports;
const Signal = signals.Signal || signals;

const signal = new Signal();
var fn0 = function() {}
var fn1 = function(x) { return x; }
var fn2 = function() { return false }
var fn3 = function() { throw new Error('listener error') }
var fn4 = function() { return true }
  signal.halt();
  signal.remove(fn1);
  signal.remove(fn1);
  signal.dispatch(null, 52);
  signal.add(fn2, null, 4);
  signal.remove(fn1);
  signal.remove(fn1);
  signal.dispatch(, );
  signal.dispatch({"x":91}, null);
  signal.add(fn2, null, 2);
  signal.add(fn2, null, 4);
  signal.remove(fn1);
  signal.remove(fn1);
  signal.dispatch(, );
  signal.dispatch({"x":91}, );
  signal.addOnce(fn1, null, 0);
  signal.add(fn1, null, 2);
  signal.dispatch(false);
  signal.remove(fn1);
  signal.addOnce(fn4, null, 2);
  signal.add(fn4, null, 2);
  signal.dispatch(null, );
  signal.add(fn1, null, 2);
  signal.dispatch(null, [142,"142"]);
  signal.add(fn2, null, 2);
  signal.add(fn2, null, 0);
  signal.addOnce(fn4, null, 2);
  signal.dispatch(null, null);
  signal.add(fn2, null, 0);
  signal.addOnce(fn4, null, 2);
  signal.addOnce(fn3, null, 1);
  signal.remove(fn3);
  signal.dispatch();
  signal.add(fn1, null, 2);
  signal.dispatch([142,"142"], [54]);
  signal.addOnce(fn4, null, 2);
  signal.add(fn1, null, 2);
  signal.addOnce(fn2, null, 0);
  signal.addOnce(fn2, null, 2);
  signal.dispatch();
  signal.add(fn4, null, 0);
  signal.add(fn0, null, 0);