# fuzzing-js-types

Automatic TypeScript type inference for JavaScript libraries using coverage-guided fuzzing.

## Prerequisites
- Node.js v18+
- Run `npm install` to install dependencies

## How to Run

1. Create a `./corpus` directory at the project root
2. Run `npm run build` to compile the project into `/dist`
3. Run `npm run fuzz` to start coverage-guided fuzzing with Jazzer.js — runs until corpus stabilizes (~10 minutes)
4. Run `npm run cov-report` to generate a coverage report in `./coverage` using c8
5. Run `npx tsx fuzzer/process-dir.ts` to run type inference on the corpus and generate `.d.ts` declaration files, output to `/seeds/`