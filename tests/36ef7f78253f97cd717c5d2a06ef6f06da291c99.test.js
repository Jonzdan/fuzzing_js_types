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
  signal.addOnce(fn4, null, 4);
  signal.addOnce(fn4, null, 4);
  signal.addOnce(fn4, null, 4);
  signal.addOnce(fn4, null, 4);
  signal.addOnce(fn4, null, 3);
  signal.add(fn2, null, 3);
  signal.add(fn0, null, 4);
  signal.add(fn3, null, 0);
  signal.add(fn0, null, 0);
  signal.add(fn3, null, 0);
  signal.dispatch(null, 64);
  signal.dispatch(null, null);
  signal.remove(fn2);
  signal.dispatch(null, );
  signal.addOnce(fn0, null, 0);