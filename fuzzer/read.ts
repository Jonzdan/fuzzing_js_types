import { readFileSync } from "node:fs";

type Action =
  | { type: "add"; fnId: number; priority: number }
  | { type: "addOnce"; fnId: number; priority: number }
  | { type: "dispatch"; args: any[] }
  | { type: "remove"; fnId: number }
  | { type: "halt" };

export function decode(data: Uint8Array): Action[] {
    const actions: Action[] = [];

    let i = 0;

    const next = () => data[i++] ?? 0;

    const makeFnId = (b: number) => b % 5;
    const makePriority = (b: number) => b % 5;
    const makeVal = (b: number) => {
        switch (b % 12) {
            case 0: return undefined;
            case 1: return null;
            case 2: return true;
            case 3: return false;
            case 4: return b;
            case 5: return String(b);
            case 6: return [b];
            case 7: return { x: b };
            case 8: return NaN;
            case 9: return -b;
            case 10: return [b, String(b)];
            default: return { x: { y: b } };
        }
    };

    while (i < data.length) {
        const op = next() % 18;

        if (op === 0) {
            actions.push({
                type: "add",
                fnId: makeFnId(next()),
                priority: makePriority(next())
            });
        }

        else if (op === 1) {
            actions.push({
                type: "addOnce",
                fnId: makeFnId(next()),
                priority: makePriority(next())
            });
        }

        else if (op === 2) {
            const argc = next() % 3;
            const args = [];

            for (let j = 0; j < argc; j++) {
                const v = next();
                args.push(makeVal(next()));
            }

            actions.push({ type: "dispatch", args });
        }

        else if (op === 3) {
            actions.push({ type: "remove", fnId: makeFnId(next()) });
        }

        else if (op === 6) {
            actions.push({ type: "halt" });
        }
    }

    return actions;
}
