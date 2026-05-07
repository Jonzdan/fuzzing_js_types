import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import { Instrumenter, Trace, ScopeMap } from "../src/trace";
import { inferTypes } from "src/analyzer";
import { codegen } from "src/codegen";

const inputFile = process.argv[2];

if (!inputFile) {
    console.error("Usage: npx tsx src/run.ts <path-to-js-file>");
    process.exit(1);
}

const source = fs.readFileSync(inputFile, "utf-8");

const scopeMap = new ScopeMap();
const instrumenter = new Instrumenter(scopeMap);
const instrumented = instrumenter.instrument(source);

const instrumentedOut = path.join("logs", "instrumented.js");
fs.writeFileSync(instrumentedOut, `${instrumented}`, "utf-8");
console.log(`Instrumented source written to ${instrumentedOut}`);

// const context = vm.createContext({ Trace, console });

// try {
//     vm.runInNewContext(instrumented, context);
// } catch (err) {
//     console.error("Runtime error in instrumented code:", err);
//     process.exit(1);
// }

// const log = Trace.getLog();

// const logPath = path.join("logs", "trace.log");

// const lines = log.map((entry: unknown) => JSON.stringify(entry)).join("\n") + "\n";
// fs.writeFileSync(logPath, lines, "utf-8");

// console.log(`Trace log written to ${logPath} (${log.length} entries)`);
// const typemap = inferTypes(log, scopeMap);
// codegen(source, typemap, scopeMap, "./output.ts");
