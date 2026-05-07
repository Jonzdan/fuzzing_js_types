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
  signal.add(fn1, null, 1);
  signal.halt();
  signal.add(fn3, null, 2);
  signal.add(fn0, null, 0);
  signal.add(fn0, null, 0);
  signal.add(fn4, null, 4);
  signal.add(fn3, null, 3);
  signal.dispatch(null, null);
  signal.dispatch(null, null);
  signal.dispatch(null, null);
  signal.dispatch(null, {"x":43});
  signal.add(fn0, null, 0);