export const Trace = (() => {
    let log: any[] = [];

    function emit(entry: any) {
        log.push(entry);
    }

    return {
        getLog() {
            return log;
        },

        assign(varId: number, value: any) {
            emit({ type: "assign", varId, value });
            return value;
        },

        enter(fnId: number, args: IArguments, fnName: string | null) {
            emit({
                type: "enter",
                fnId,
                args: Array.from(args),
                fnName
            });
        },

        returning(fnId: number, value: any) {
            emit({
                type: "returning",
                fnId,
                value
            });
            return value;
        },

        create(objId: number, obj: any, className: string | null) {
            const proxy = new Proxy(obj, {
                set(target, prop, value) {
                    target[prop] = value;

                    emit({
                        type: "prop",
                        objId,
                        prop,
                        value
                    });

                    return true;
                }
            });

            emit({
                type: "create",
                objId,
                className
            });

            return proxy;
        }
    };
})();
