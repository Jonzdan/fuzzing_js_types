// Trace is global shared const (singleton)
const { Trace } = require("../dist/src/trace/trace.js");
const { inferTypes } = require("../dist/src/analyzer/index.js")
const { ScopeMap, Instrumenter } = require("../dist/src/trace/index.js")
const { codegen } = require("../dist/src/codegen/index.js");
const mod = { exports: {} };
const fs = require("fs");
const path = require("path");
const util = require("node:util");

/**
 * Should be determinstic, so scopeMap should point towards same AST.  
 * Source = non-instrumented source 
 */
const source = fs.readFileSync("seeds/signals.js", "utf-8");
const scopeMap = new ScopeMap();
const instrumenter = new Instrumenter(scopeMap);
const instrumented = instrumenter.instrument(source);
const instrumentedOut = path.join("seeds", "instrumented_signals.js");
fs.writeFileSync(instrumentedOut, `${instrumented}`, "utf-8");
console.log(`Instrumented source written to ${instrumentedOut}`);

eval(`(function(module, exports, require, Trace) { ${instrumented} })`)(mod, mod.exports, require, Trace);
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

const log = Trace.getLog();
const logPath = path.join("logs", "trace.log");

const lines = log.map(e =>
    util.inspect(e, { depth: null, breakLength: Infinity })
).join("\n") + "\n";
fs.writeFileSync(logPath, lines, "utf-8");

console.time('inference time')
const {typeMap, classInstances} = inferTypes(Trace.getLog(), scopeMap);
console.timeEnd('inference time')
console.time('gen time')
codegen(source, typeMap, scopeMap, classInstances, "./seeds/signals.ts")
console.timeEnd('gen time')
