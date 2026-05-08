import fs from "fs";
import path from "path";

type DecodeOp =
    | { type: "add"; fnId: number; priority?: number }
    | { type: "addOnce"; fnId: number; priority?: number }
    | { type: "dispatch"; args: any[] }
    | { type: "remove"; fnId: number }
    | { type: "halt" };

type DecodedResult = {
    file: string;
    size: number;
    decoded: DecodeOp[];
};

const { decode } = require("./read") as {
    decode: (bytes: Uint8Array) => DecodeOp[];
};

function readCorpus(dir: string): DecodedResult[] {
    const files = fs.readdirSync(dir);
    const results: DecodedResult[] = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);

        if (!fs.statSync(fullPath).isFile()) continue;

        const data = fs.readFileSync(fullPath);

        // raw bytes from file
        const bytes = new Uint8Array(data);

        const decoded = decode(bytes);

        results.push({
            file,
            size: bytes.length,
            decoded
        });
    }

    return results;
}

function toJestTest(file: string, ops: DecodeOp[]): string {
    let lines: string[] = [];

    lines.push(`const { Trace } = require("../dist/src/trace/trace.js");`);
    lines.push(`const mod = { exports: {} };`);
    lines.push(`const fs = require("fs");`);
    lines.push(`const code = fs.readFileSync(require("path").join(__dirname, "../seeds/instrumented_signals.js"), "utf8");`);
    lines.push('eval(`(function(module, exports, require, Trace) { ${code} })`)(mod, mod.exports, require, Trace, {});');
    lines.push(`const signals = mod.exports;`);
    lines.push(`const Signal = signals.Signal || signals;`);
    lines.push(``);
    lines.push(`const signal = new Signal();`);
    const fns = [
        "var fn0 = function() {}",
        "var fn1 = function(x) { return x; }",
        "var fn2 = function() { return false }",
        "var fn3 = function() { throw new Error('listener error') }",
        "var fn4 = function() { return true }"
    ];
    lines = lines.concat(fns);

    for (const op of ops) {
        switch (op.type) {
            case "add":
                lines.push(
                    `  signal.add(fn${op.fnId % 5}, null, ${(op.priority ?? 0)});`
                );
                break;

            case "addOnce":
                lines.push(
                    `  signal.addOnce(fn${op.fnId % 5}, null, ${(op.priority ?? 0)});`
                );
                break;

            case "dispatch":
                lines.push(
                    `  signal.dispatch(${op.args.map(a => JSON.stringify(a)).join(", ")});`
                );
                break;

            case "remove":
                lines.push(`  signal.remove(fn${op.fnId % 5});`);
                break;

            case "halt":
                lines.push(`  signal.halt();`);
                break;
        }
    }
    return lines.join("\n");
}

const corpusDir: string = path.join(__dirname, "../corpus");
const outDir = path.join(__dirname, "../tests");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const results = readCorpus(corpusDir);

for (const r of results) {
    const testCode = toJestTest(r.file, r.decoded);

    const outPath = path.join(outDir, r.file + ".test.js");
    fs.writeFileSync(outPath, testCode);

    console.log("WROTE:", outPath);
}

