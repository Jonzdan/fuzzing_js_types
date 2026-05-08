const { readFileSync } = require("fs");
const path = require("path");
const vm = require("vm");

const mod = { exports: {} };
let code = readFileSync(path.join(__dirname, "../seeds/signals.js"), "utf8");
const context = vm.createContext({ global: globalThis, require });
vm.runInContext(code, context, {
    filename: path.resolve(__dirname, "../seeds/signals.js"),
});

const Signal = context.Signal || context.signals?.Signal || globalThis.signals?.Signal;

function val(b) {
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
}

function listener(kind) {
    switch (kind % 5) {
        case 0: return function () {};
        case 1: return function () { return false; };
        case 2: return function (x) { return x; };
        case 3: return function () { throw new Error("listener error"); };
        default: return function () { return true; };
    }
}

module.exports.fuzz = function (data) {
    const signal = new Signal();

    const listeners = [];
    const bindings = [];

    const MAX_OPS = 128;

    for (let i = 0, step = 0; i < data.length && step < MAX_OPS; i++, step++) {
        const op = data[i] % 18;

        try {
        switch (op) {
            case 0: { // add
                const fn = listener(data[i + 1] || 0);
                listeners.push(fn);
                const b = signal.add(fn, null, (data[i + 2] || 0) % 5);
                if (b) bindings.push(b);
                i += 2;
                break;
            }

            case 1: { // addOnce
                const fn = listener(data[i + 1] || 0);
                listeners.push(fn);
                const b = signal.addOnce(fn, null, (data[i + 2] || 0) % 5);
                if (b) bindings.push(b);
                i += 2;
                break;
            }

            case 2: { // dispatch
                const argc = (data[i + 1] || 0) % 3;
                const args = [];

                for (let j = 0; j < argc; j++) {
                    args.push(val(data[i + 2 + j] || 0));
                }

                signal.dispatch(...args);
                    i += 1 + argc;
                    break;
            }

            case 3: { // remove
                const fn =
                    listeners.length
                    ? listeners[(data[i + 1] || 0) % listeners.length]
                    : listener(0);

                signal.remove(fn, null);
                i += 1;
                break;
            }

            case 4:
                signal.removeAll();
                break;

                case 5: { // has
                const fn =
                    listeners.length
                    ? listeners[(data[i + 1] || 0) % listeners.length]
                    : listener(0);

                signal.has(fn, null);
                i += 1;
                break;
            }

            case 6:
                signal.halt();
            break;

            case 7:
                signal.forget();
            break;

            case 8:
                signal.dispose();
            break;

            case 9:
                signal.getNumListeners();
            break;

            case 10:
                signal.toString();
            break;

            case 11:
                if (bindings.length) {
                    const b = bindings[(data[i + 1] || 0) % bindings.length];
                    b.execute([val(data[i + 2] || 0)]);
                    i += 2;
                }
                break;

            case 12:
                if (bindings.length) {
                    bindings[(data[i + 1] || 0) % bindings.length].detach();
                    i += 1;
                }
                break;

            case 13:
                if (bindings.length) {
                    bindings[(data[i + 1] || 0) % bindings.length].isBound();
                    i += 1;
                }
                break;

            case 14:
                if (bindings.length) {
                    bindings[(data[i + 1] || 0) % bindings.length].isOnce();
                    i += 1;
                }
                break;

            case 15:
                if (bindings.length) {
                    bindings[(data[i + 1] || 0) % bindings.length].getListener();
                    i += 1;
                }
                break;

            case 16:
                if (bindings.length) {
                    bindings[(data[i + 1] || 0) % bindings.length].getSignal();
                    i += 1;
                }
                break;

            case 17:
                if (bindings.length) {
                    bindings[(data[i + 1] || 0) % bindings.length].toString();
                    i += 1;
                }
                break;
        }
        } catch (_) {
        }
    }
};
