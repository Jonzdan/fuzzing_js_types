import { SymbolId, TraceLogFormats } from "./types";

type TraceType = {
    clearLog(): void;
    getLog(): TraceLogFormats[];
    enter(id: number, args: IArguments, fnRef: Function): void;
    returning(id: number, value: any): any;
    exit(id: number): void;
    assign(id: number, value: any): any;
    prop(id: number, propName: string, value: any): any;
    ctor(id: number, fnRef: Function): void;
    create(id: number, obj: any, className: string | null, isCtor?: boolean, fnRef?: Function | null): any;
};

export const Trace: TraceType = (() => {
    let log: TraceLogFormats[] = [];
    let nextHeapId = 1_000_000;
    const trackedIds = new Map<Object, number>();

    const callStack: number[] = [];

    function emit(entry: TraceLogFormats) {
        log.push(entry);
    }

    function allocHeapId(): number {
        return nextHeapId++;
    }

    function handleObjRef(value: any, enclosedValue = true) {
        if (value && typeof value === "object") {
            if (!trackedIds.has(value)) {
                const id = allocHeapId();
                trackedIds.set(value, id);
                // recursively track nested object
                const proxy = Trace.create(id, value, null);

                trackedIds.set(proxy, id);
                value = proxy;
            }

            return { refId: trackedIds.get(value)! };
        }

        return enclosedValue ? { value } : value;
    }

    function createProxy(obj: any, id: SymbolId) {
        return new Proxy(obj, {
            get(target, prop, receiver) {
                const value = Reflect.get(target, prop, receiver);
                if (typeof prop !== "symbol") {
                    emit({
                        type: "prop",
                        id,
                        prop,
                        value,
                        isRead: true,
                        isDeletion: false,
                        isInitial: false,
                        callStack: [...callStack]
                    });
                }
                return value;
            },

            deleteProperty(target, prop): boolean {
                if (typeof prop === "symbol") {
                    return false;
                }
                delete target[prop];

                emit({
                    type: "prop",
                    id,
                    prop,
                    value: undefined,
                    isRead: false,
                    isDeletion: true,
                    isInitial: false,
                    callStack: [...callStack]
                });
                return true;
            },

            set(target, prop, value) {
                target[prop as string] = value;

                emit({
                    type: "prop",
                    id,
                    prop,
                    ...handleObjRef(value),
                    isRead: false,
                    isDeletion: false,
                    isInitial: false,
                    callStack: [...callStack]
                });

                return true;
            }
        });
    }

    return {
        clearLog() {
            log = [];
        },

        getLog() {
            return [...log];
        },

        enter(id: SymbolId, args: IArguments, fnRef: Function) {
            callStack.push(id);
            emit({
                type: "enter",
                id,
                args: Array.from(args).map(value => handleObjRef(value, false)),
                fn: fnRef,
                callStack: [...callStack]
            });
        },

        returning(id: SymbolId, value: any) {
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
        exit(id: SymbolId) {
            if (callStack[callStack.length - 1] === id) {
                callStack.pop();
            }

            emit({
                type: "exit",
                id,
                callStack: [...callStack]
            });
        },

        assign(id: SymbolId, value: any) {
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
        prop(id: SymbolId, propName: string, value: any) {
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
        create(id: SymbolId, obj: object, className: string | null, isCtor: boolean = false, fnRef: Function | null = null) {
            const creationStack = [...callStack];
            
            const proxy = createProxy(obj, id);
            trackedIds.set(proxy, id);

            emit({
                type: "create",
                id,
                className,
                isArray: Array.isArray(obj),
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
                    isRead: false,
                    isDeletion: false,
                    isInitial: true,
                    callStack: [...callStack]
                });
            }

            return proxy;
        }
    };
})();
