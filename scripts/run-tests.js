// Trace is global shared const (singleton)
const { Trace } = require("../dist/src/trace/trace.js");
const { inferTypes } = require("../dist/src/analyzer/index.js")
const { ScopeMap, Instrumenter } = require("../dist/src/trace/index.js")
const { codegen } = require("../dist/src/codegen/index.js");
const mod = { exports: {} };
const fs = require("fs");
const path = require("path");

const code = fs.readFileSync(path.join(__dirname, "../seeds/instrumented_signals.js"), "utf8");
eval(`(function(module, exports, require, Trace) { ${code} })`)(mod, mod.exports, require, Trace);
const signals = mod.exports;
const Signal = signals.Signal || signals;

const testDir = path.join(__dirname, "../tests");
const files = fs.readdirSync(testDir).filter(f => f.endsWith(".js"));
for (const file of files) {
    try{
        require(path.join(testDir, file));
    } catch (e) {
        // console.error(e)
        // do nothing
    }
}

console.log("Trace log entries:", Trace.getLog().length);

/**
 * Should be determinstic, so scopeMap should point towards same AST.  
 * Source = non-instrumented source 
 */
const source = fs.readFileSync("seeds/signals.js", "utf-8");
const scopeMap = new ScopeMap();
const instrumenter = new Instrumenter(scopeMap);
instrumenter.instrument(source);

console.time('inference time')
const typeMap = inferTypes(Trace.getLog(), scopeMap);
console.timeEnd('inference time')
console.time('gen start')
codegen(source, typeMap, scopeMap, "./instrumented_source.ts")
console.timeEnd('gen start')
