// scripts/run-corpus.js
const { readFileSync, readdirSync } = require("fs");
const { FuzzedDataProvider } = require("@jazzer.js/core");
const vm = require("vm");
const { Trace, ScopeMap, Instrumenter } = require("../dist/src/trace/index.js");
const { inferTypes } = require("../dist/src/analyzer/index.js");
const { codegen } = require("../dist/src/codegen/gen.js");

// Instrument
const source = readFileSync("seeds/js-signals.js", "utf-8");
const scopeMap = new ScopeMap();
const instrumenter = new Instrumenter(scopeMap);
const instrumented = instrumenter.instrument(source);
const context = vm.createContext({ Trace, console });
vm.runInNewContext(instrumented + "\nthis.Signal = Signal;", context);
const Signal = context.Signal;

function fn0(x) {}
function fn1(x) {}
function fn2(x) {}

// Replay each corpus file
const corpusFiles = readdirSync("corpus/");
console.log(`Replaying ${corpusFiles.length} corpus files...`);

for (const file of corpusFiles) {
    const data = readFileSync(`corpus/${file}`);
    const provider = new FuzzedDataProvider(data);

    try {
        const s = new Signal();

        const priority0 = provider.consumeIntegralInRange(0, 10);
        const priority1 = provider.consumeIntegralInRange(0, 10);
        const shouldMemorize = provider.consumeBoolean();
        const shouldHalt = provider.consumeBoolean();
        const shouldActiveOff = provider.consumeBoolean();
        const dispatchValue = provider.consumeString(50);
        const dispatchValue2 = provider.consumeString(50);

        console.log(`\n── ${file} ──`);
        console.log({ priority0, priority1, shouldMemorize, shouldHalt, shouldActiveOff, dispatchValue, dispatchValue2 });

        s.memorize = shouldMemorize;
        if (shouldActiveOff) s.active = false;

        s.add(fn0, null, priority0);
        s.addOnce(fn1, null, priority1);
        s.dispatch(dispatchValue);
        if (shouldHalt) s.halt();
        s.add(fn2);
        s.dispatch(dispatchValue2);
        s.remove(fn0);
        s.removeAll();
        s.forget();
    } catch(_) {}
}

// Infer and codegen
console.log(`Collected ${Trace.getLog().length} trace entries`);
const typeMap = inferTypes(Trace.getLog(), scopeMap);
codegen(source, typeMap, scopeMap, "./output.ts");
console.log("Done — output.ts written");