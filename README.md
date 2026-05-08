
# How to Run

Create ./corpus folder at top-level project root dir

run "npm run build" to init /dist folder

run "npm run fuzz" to set coverage env, and fuzz using jazzer

run "npm run cov-report" to generate ./coverage folder for code coverage information using c8

run "npx tsx fuzzer/process-dir.ts" to generate output files. output declaration files are stored in /seeds/ 