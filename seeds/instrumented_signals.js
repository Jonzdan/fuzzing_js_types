(function (global) {
    Trace.enter(1, arguments, arguments.callee);
    function SignalBinding(signal, listener, isOnce, listenerContext, priority) {
        Trace.enter(2, arguments, arguments.callee);
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
            Trace.enter(3, arguments, arguments.callee);
            var handlerReturn = Trace.assign(4, undefined), params = Trace.assign(5, undefined);
            if (this.active && !!this._listener) {
                params = Trace.assign(5, this.params ? this.params.concat(paramsArr) : paramsArr);
                handlerReturn = Trace.assign(4, this._listener.apply(this.context, params));
                if (this._isOnce) {
                    this.detach();
                }
            }
            return Trace.returning(3, handlerReturn);
            Trace.exit(3);
        },
        detach: function () {
            Trace.enter(6, arguments, arguments.callee);
            return Trace.returning(6, this.isBound() ? this._signal.remove(this._listener, this.context) : null);
            Trace.exit(6);
        },
        isBound: function () {
            Trace.enter(7, arguments, arguments.callee);
            return Trace.returning(7, !!this._signal && !!this._listener);
            Trace.exit(7);
        },
        isOnce: function () {
            Trace.enter(8, arguments, arguments.callee);
            return Trace.returning(8, this._isOnce);
            Trace.exit(8);
        },
        getListener: function () {
            Trace.enter(9, arguments, arguments.callee);
            return Trace.returning(9, this._listener);
            Trace.exit(9);
        },
        getSignal: function () {
            Trace.enter(10, arguments, arguments.callee);
            return Trace.returning(10, this._signal);
            Trace.exit(10);
        },
        _destroy: function () {
            Trace.enter(11, arguments, arguments.callee);
            delete this._signal;
            delete this._listener;
            delete this.context;
            Trace.exit(11);
        },
        toString: function () {
            Trace.enter(12, arguments, arguments.callee);
            return Trace.returning(12, '[SignalBinding isOnce:' + this._isOnce + ', isBound:' + this.isBound() + ', active:' + this.active + ']');
            Trace.exit(12);
        }
    };
    function validateListener(listener, fnName) {
        Trace.enter(13, arguments, arguments.callee);
        if (typeof listener !== 'function') {
            throw new Error('listener is a required param of {fn}() and should be a Function.'.replace('{fn}', fnName));
        }
        Trace.exit(13);
    }
    function Signal() {
        Trace.enter(14, arguments, arguments.callee);
        this._bindings = [];
        this._prevParams = null;
        var self = Trace.assign(15, this);
        this.dispatch = function () {
            Trace.enter(16, arguments, arguments.callee);
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
            Trace.enter(17, arguments, arguments.callee);
            var prevIndex = Trace.assign(18, this._indexOfListener(listener, listenerContext)), binding = Trace.assign(19, undefined);
            if (prevIndex !== -1) {
                binding = Trace.assign(19, this._bindings[prevIndex]);
                if (binding.isOnce() !== isOnce) {
                    throw new Error('You cannot add' + (isOnce ? '' : 'Once') + '() then add' + (!isOnce ? '' : 'Once') + '() the same listener without removing the relationship first.');
                }
            } else {
                binding = Trace.create(19, new SignalBinding(this, listener, isOnce, listenerContext, priority), 'SignalBinding', true, SignalBinding);
                this._addBinding(binding);
            }
            if (this.memorize && this._prevParams) {
                binding.execute(this._prevParams);
            }
            return Trace.returning(17, binding);
            Trace.exit(17);
        },
        _addBinding: function (binding) {
            Trace.enter(20, arguments, arguments.callee);
            var n = Trace.assign(21, this._bindings.length);
            do {
                --n;
            } while (this._bindings[n] && binding._priority <= this._bindings[n]._priority);
            this._bindings.splice(n + 1, 0, binding);
            Trace.exit(20);
        },
        _indexOfListener: function (listener, context) {
            Trace.enter(22, arguments, arguments.callee);
            var n = Trace.assign(23, this._bindings.length), cur = Trace.assign(24, undefined);
            while (n--) {
                cur = Trace.assign(24, this._bindings[n]);
                if (cur._listener === listener && cur.context === context) {
                    return Trace.returning(22, n);
                }
            }
            return Trace.returning(22, -1);
            Trace.exit(22);
        },
        has: function (listener, context) {
            Trace.enter(25, arguments, arguments.callee);
            return Trace.returning(25, this._indexOfListener(listener, context) !== -1);
            Trace.exit(25);
        },
        add: function (listener, listenerContext, priority) {
            Trace.enter(26, arguments, arguments.callee);
            validateListener(listener, 'add');
            return Trace.returning(26, this._registerListener(listener, false, listenerContext, priority));
            Trace.exit(26);
        },
        addOnce: function (listener, listenerContext, priority) {
            Trace.enter(27, arguments, arguments.callee);
            validateListener(listener, 'addOnce');
            return Trace.returning(27, this._registerListener(listener, true, listenerContext, priority));
            Trace.exit(27);
        },
        remove: function (listener, context) {
            Trace.enter(28, arguments, arguments.callee);
            validateListener(listener, 'remove');
            var i = Trace.assign(29, this._indexOfListener(listener, context));
            if (i !== -1) {
                this._bindings[i]._destroy();
                this._bindings.splice(i, 1);
            }
            return Trace.returning(28, listener);
            Trace.exit(28);
        },
        removeAll: function () {
            Trace.enter(30, arguments, arguments.callee);
            var n = Trace.assign(31, this._bindings.length);
            while (n--) {
                this._bindings[n]._destroy();
            }
            this._bindings.length = 0;
            Trace.exit(30);
        },
        getNumListeners: function () {
            Trace.enter(32, arguments, arguments.callee);
            return Trace.returning(32, this._bindings.length);
            Trace.exit(32);
        },
        halt: function () {
            Trace.enter(33, arguments, arguments.callee);
            this._shouldPropagate = false;
            Trace.exit(33);
        },
        dispatch: function (params) {
            Trace.enter(34, arguments, arguments.callee);
            if (!this.active) {
                return Trace.returning(34, undefined);
            }
            var paramsArr = Trace.assign(35, Array.prototype.slice.call(arguments)), n = Trace.assign(36, this._bindings.length), bindings = Trace.assign(37, undefined);
            if (this.memorize) {
                this._prevParams = paramsArr;
            }
            if (!n) {
                return Trace.returning(34, undefined);
            }
            bindings = Trace.assign(37, this._bindings.slice());
            this._shouldPropagate = true;
            do {
                n--;
            } while (bindings[n] && this._shouldPropagate && bindings[n].execute(paramsArr) !== false);
            Trace.exit(34);
        },
        forget: function () {
            Trace.enter(38, arguments, arguments.callee);
            this._prevParams = null;
            Trace.exit(38);
        },
        dispose: function () {
            Trace.enter(39, arguments, arguments.callee);
            this.removeAll();
            delete this._bindings;
            delete this._prevParams;
            Trace.exit(39);
        },
        toString: function () {
            Trace.enter(40, arguments, arguments.callee);
            return Trace.returning(40, '[Signal active:' + this.active + ' numListeners:' + this.getNumListeners() + ']');
            Trace.exit(40);
        }
    };
    var signals = Trace.assign(41, Signal);
    signals.Signal = Signal;
    if (typeof define === 'function' && define.amd) {
        define(function () {
            Trace.enter(42, arguments, arguments.callee);
            return Trace.returning(42, signals);
            Trace.exit(42);
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = signals;
    } else {
        global['signals'] = signals;
    }
    Trace.exit(1);
}(this));