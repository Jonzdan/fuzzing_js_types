/* AUTO-GENERATED */
export declare function SignalBinding(signal: { _prevParams: null }, listener: () => void, isOnce: boolean, listenerContext: null, priority: number): SignalBinding;
interface SignalBinding {
}

export declare function execute(paramsArr: (any[] | boolean[] | null[] | number[] | string[] | void[])): (boolean | null | number | undefined);
export declare function detach(): void;
export declare function isBound(): boolean;
export declare function isOnce(): boolean;
export declare function getListener(): void;
export declare function getSignal(): void;
export declare function _destroy(): void;
export declare function toString(): void;
export declare function validateListener(listener: () => void, fnName: string): void;
export declare function Signal(): void;
export declare var self: { _prevParams: null; _bindings: void[] };
export declare function _registerListener(listener: () => void, isOnce: boolean, listenerContext: null, priority: number): undefined;
export declare function _addBinding(binding: undefined): void;
export declare function _indexOfListener(listener: () => void, context: (null | undefined)): number;
export declare function has(listener: undefined, context: undefined): void;
export declare function add(listener: () => void, listenerContext: null, priority: number): undefined;
export declare function addOnce(listener: () => void, listenerContext: null, priority: number): undefined;
export declare function remove(listener: () => void, context?: (null | undefined)): void;
export declare function removeAll(): void;
export declare function getNumListeners(): void;
export declare function halt(): void;
export declare function dispatch(params?: (any[] | boolean | null | number | number[] | string | undefined | { x: number } | {}), undefined?: (boolean | null | number | number[] | {})): (undefined | void);
export declare function forget(): void;
export declare function dispose(): void;
export declare function toString(): void;
export declare var signals: () => void;
