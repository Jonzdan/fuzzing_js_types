import { TraceLogFormats } from "./types";

export const Trace = (() => {
    let log: any[] = [];
    const trackedIds = new Map<Object, number>();

    /**
     * Runtime call stack of ids currently executing.  Maintained by
     * enter/returning/exit so that every prop and assign entry is tagged
     * with the full call context at the time of the observation.
     * This is the data duck-type inference needs to restrict observed
     * values to those seen during a particular function's execution.
     */
    let callStack: number[] = [];

    function emit(entry: TraceLogFormats) {
        log.push(entry);
    }

    function handleObjRef(value: any, enclosedValue: boolean = true) {
        return (
            trackedIds.has(value)
                ? { refId: trackedIds.get(value) }
                : (enclosedValue
                    ? { value }
                    : value)
        )
    }

    return {
        getLog() {
            return log;
        },

        enter(id: number, args: IArguments, fnRef: Function) {
            callStack.push(id);
            emit({
                type: "enter",
                id,
                args: Array.from(args).map(value => handleObjRef(value, false)),
                fn: fnRef,
                callStack: [...callStack]
            });
        },

        returning(id: number, value: any) {
            callStack.pop();
            emit({
                type: "returning",
                id,
                ...handleObjRef(value),
                callStack: [...callStack]
            });
            return value;
        },

        /**
         * Called as the final statement of every function body to handle
         * void fall-through (i.e. functions that return without a return
         * statement).  If returning() already fired for this invocation,
         * the stack will have been popped already — so we guard with a
         * peek check.
         */
        exit(id: number) {
            if (callStack[callStack.length - 1] === id) {
                callStack.pop();
            }
            emit({
                type: "exit",
                id,
                callStack: [...callStack]
            });
        },

        assign(id: number, value: any) {
            // Handle (multiple) object ref reassignments
            emit({
                type: "assign",
                id,
                ...handleObjRef(value)
            });

            return value;
        },

        /**
         * Called directly from instrumented constructor bodies for `this.x = y` writes. 
         */
        prop(id: number, propName: string, value: any) {
            emit({
                type: "prop",
                id,
                prop: propName,
                callStack: [...callStack],
                ...handleObjRef(value)
            });
            return value;
        },

        ctor(id: number, fnRef: Function) {
            emit({
                type: "ctor",
                fn: fnRef,
                id,
            });
        },

        /**
         * Wraps obj in a proxy that emits a `prop` entry on every property
         * write.  Also emits a `create` entry and a `ctor` entry when isCtor is true that links
         * the constructor function to the new object id
         */
        create(id: number, obj: any, className: string | null, isCtor: boolean = false, fnRef: Function | null = null) {
            // Capture call stack at creation time, not at property-write time for execution context. (e.g. for duck typing)
            const creationStack = [...callStack];

            const proxy = new Proxy(obj, {
                set(target, prop, value) {
                    target[prop as string] = value;

                    emit({
                        type: "prop",
                        id,
                        prop,
                        ...handleObjRef(value),
                        callStack: [...callStack]
                    });

                    return true;
                }
            });

            trackedIds.set(proxy, id);

            emit({
                type: "create",
                id,
                className,
                callStack: creationStack
            });

            if (isCtor) {
                emit({
                    type: "ctor",
                    id,
                    fn: fnRef       
                });
            }

            for (const [prop, value] of Object.entries(obj)) {
                emit({
                    type: "prop",
                    id,
                    prop,
                    ...handleObjRef(value),
                    callStack: [...callStack]
                });
            }

            return proxy;
        }
    };
})();
