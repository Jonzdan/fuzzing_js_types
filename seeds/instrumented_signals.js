(function (global) {
    function SignalBinding(signal, listener, isOnce, listenerContext, priority) {
        Trace.enter(2, arguments);
        this._listener = listener;
        this._isOnce = isOnce;
        this.context = listenerContext;
        this._signal = signal;
        this._priority = priority || 0;
        Trace.exit(2);
    }
    SignalBinding.prototype = {
        active: true,
        params: null,
        execute: function (paramsArr) {
            Trace.enter(3, arguments);
            var handlerReturn, params;
            if (this.active && !!this._listener) {
                params = this.params ? this.params.concat(paramsArr) : paramsArr;
                handlerReturn = this._listener.apply(this.context, params);
                if (this._isOnce) {
                    this.detach();
                }
            }
            return Trace.returning(3, handlerReturn);
            Trace.exit(3);
        },
        detach: function () {
            Trace.enter(6, arguments);
            return Trace.returning(6, this.isBound() ? this._signal.remove(this._listener, this.context) : null);
            Trace.exit(6);
        },
        isBound: function () {
            Trace.enter(7, arguments);
            return Trace.returning(7, !!this._signal && !!this._listener);
            Trace.exit(7);
        },
        isOnce: function () {
            Trace.enter(8, arguments);
            return Trace.returning(8, this._isOnce);
            Trace.exit(8);
        },
        getListener: function () {
            Trace.enter(9, arguments);
            return Trace.returning(9, this._listener);
            Trace.exit(9);
        },
        getSignal: function () {
            Trace.enter(10, arguments);
            return Trace.returning(10, this._signal);
            Trace.exit(10);
        },
        _destroy: function () {
            Trace.enter(11, arguments);
            delete this._signal;
            delete this._listener;
            delete this.context;
            Trace.exit(11);
        },
        toString: function () {
            Trace.enter(12, arguments);
            return Trace.returning(12, '[SignalBinding isOnce:' + this._isOnce + ', isBound:' + this.isBound() + ', active:' + this.active + ']');
            Trace.exit(12);
        }
    };
    function validateListener(listener, fnName) {
        Trace.enter(13, arguments);
        if (typeof listener !== 'function') {
            throw new Error('listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName));
        }
        Trace.exit(13);
    }
    function Signal() {
        Trace.enter(14, arguments);
        this._bindings = [];
        this._prevParams = null;
        var self = this;
        this.dispatch = function () {
            Trace.enter(16, arguments);
            Signal.prototype.dispatch.apply(self, arguments);
            Trace.exit(16);
        };
        Trace.exit(14);
    }
    Signal.prototype = {
        VERSION: '1.0.0',
        memorize: false,
        _shouldPropagate: true,
        active: true,
        _registerListener: function (listener, isOnce, listenerContext, priority) {
            Trace.enter(17, arguments);
            var prevIndex = this._indexOfListener(listener, listenerContext), binding;
            if (prevIndex !== -1) {
                binding = this._bindings[prevIndex];
                if (binding.isOnce() !== isOnce) {
                    throw new Error('You cannot add' + (isOnce ? '' : 'Once') + '() then add' + (!isOnce ? '' : 'Once') + '() the same listener without removing the relationship first.');
                }
            } else {
                binding = new SignalBinding(this, listener, isOnce, listenerContext, priority);
                this._addBinding(binding);
            }
            if (this.memorize && this._prevParams) {
                binding.execute(this._prevParams);
            }
            return Trace.returning(17, binding);
            Trace.exit(17);
        },
        _addBinding: function (binding) {
            Trace.enter(20, arguments);
            var n = this._bindings.length;
            do {
                --n;
            } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
            this._bindings.splice(n + 1, 0, binding);
            Trace.exit(20);
        },
        _indexOfListener: function (listener, context) {
            Trace.enter(22, arguments);
            var n = this._bindings.length, cur;
            while (n--) {
                cur = this._bindings[n];
                if (cur._listener === listener && cur.context === context) {
                    return Trace.returning(22, n);
                }
            }
            return Trace.returning(22, -1);
            Trace.exit(22);
        },
        has: function (listener, context) {
            Trace.enter(25, arguments);
            return Trace.returning(25, this._indexOfListener(listener, context) !== -1);
            Trace.exit(25);
        },
        add: function (listener, listenerContext, priority) {
            Trace.enter(26, arguments);
            validateListener(listener, 'add');
            return Trace.returning(26, this._registerListener(listener, false, listenerContext, priority));
            Trace.exit(26);
        },
        addOnce: function (listener, listenerContext, priority) {
            Trace.enter(27, arguments);
            validateListener(listener, 'addOnce');
            return Trace.returning(27, this._registerListener(listener, true, listenerContext, priority));
            Trace.exit(27);
        },
        remove: function (listener, context) {
            Trace.enter(28, arguments);
            validateListener(listener, 'remove');
            var i = this._indexOfListener(listener, context);
            if (i !== -1) {
                this._bindings[i]._destroy();
                this._bindings.splice(i, 1);
            }
            return Trace.returning(28, listener);
            Trace.exit(28);
        },
        removeAll: function () {
            Trace.enter(30, arguments);
            var n = this._bindings.length;
            while (n--) {
                this._bindings[n]._destroy();
            }
            this._bindings.length = 0;
            Trace.exit(30);
        },
        getNumListeners: function () {
            Trace.enter(32, arguments);
            return Trace.returning(32, this._bindings.length);
            Trace.exit(32);
        },
        halt: function () {
            Trace.enter(33, arguments);
            this._shouldPropagate = false;
            Trace.exit(33);
        },
        dispatch: function (params) {
            Trace.enter(34, arguments);
            if (!this.active) {
                return Trace.returning(34, undefined);
            }
            var paramsArr = Array.prototype.slice.call(arguments), n = this._bindings.length, bindings;
            if (this.memorize) {
                this._prevParams = paramsArr;
            }
            if (!n) {
                return Trace.returning(34, undefined);
            }
            bindings = this._bindings.slice();
            this._shouldPropagate = true;
            do {
                n--;
            } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
            Trace.exit(34);
        },
        forget: function () {
            Trace.enter(38, arguments);
            this._prevParams = null;
            Trace.exit(38);
        },
        dispose: function () {
            Trace.enter(39, arguments);
            this.removeAll();
            delete this._bindings;
            delete this._prevParams;
            Trace.exit(39);
        },
        toString: function () {
            Trace.enter(40, arguments);
            return Trace.returning(40, '[Signal active:' + this.active + ' numListeners:' + this.getNumListeners() + ']');
            Trace.exit(40);
        }
    };
    var signals = Signal;
    signals.Signal = Signal;
    if (typeof define === 'function' && define.amd) {
        define(function () {
            Trace.enter(42, arguments);
            return Trace.returning(42, signals);
            Trace.exit(42);
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = signals;
    } else {
        global['signals'] = signals;
    }
}(this));