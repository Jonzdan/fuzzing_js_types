const { TraceLogEntries } = require("../dist/src/constants");

const fs = require('fs');
const queue = [];

const stream = fs.createWriteStream("logs/trace.log", { flags: "a" });

function flush() {
    if (queue.length === 0) {
        return;
    }
    const batch = queue.splice(0);
    stream.write(batch.join("\n") + "\n");
}


// TODO: update to store more data
function logEvent(type, name, value) {
    queue.push(JSON.stringify({ type, name, value }));

    if (queue.length > 50) {
        flush();
    }
}

let currentFileName = '';

/**
 * Page 32-... of the paper shows what exactly to instrument, nonbarring location metadata
 */


/*
 * Copyright 2014 Samsung Information Systems America, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Koushik Sen

// do not remove the following comment
// JALANGI DO NOT INSTRUMENT

/**
 * @file A template for writing a Jalangi 2 analysis
 * @author  Koushik Sen
 *
 */

(function (sandbox) {
    /**
     * <p>
     *     This file is a template for writing a custom Jalangi 2 analysis.  Simply copy this file and rewrite the
     *     callbacks that you need to implement in your analysis.  Other callbacks should be removed from the file.
     *</p>
     *
     * <p>
     *     In the following methods (also called as callbacks) one can choose to not return anything.
     *     If all of the callbacks return nothing, we get a passive analysis where the
     *     concrete execution happens unmodified and callbacks can be used to observe the execution.
     *     One can choose to return suitable objects with specified properties in some callbacks
     *     to modify the behavior of the concrete execution.  For example, one could set the skip
     *     property of the object returned from {@link MyAnalysis#putFieldPre} to true to skip the actual putField operation.
     *     Similarly, one could set the result field of the object returned from a {@link MyAnalysis#write} callback
     *     to modify the value that is actually written to a variable. The result field of the object
     *     returned from a {@link MyAnalysis#conditional} callback can be suitably set to change the control-flow of the
     *     program execution.  In {@link MyAnalysis#functionExit} and {@link MyAnalysis#scriptExit},
     *     one can set the <tt>isBacktrack</tt> property of the returned object to true to reexecute the body of
     *     the function from the beginning.  This in conjunction with the ability to change the
     *     control-flow of a program enables us to explore the different paths of a function in
     *     symbolic execution.
     * </p>
     *
     * <p>
     *     Note that if <tt>process.exit()</tt> is called, then an execution terminates abnormally and a callback to
     *     {@link MyAnalysis#endExecution} will be skipped.
     * </p>
     *
     * <p>
     *     An analysis can access the source map, which maps instruction identifiers to source locations,
     *     using the global object stored in <code>J$.smap</code>.  Jalangi 2
     *     assigns a unique id, called <code>sid</code>, to each JavaScript
     *     script loaded at runtime.  <code>J$.smap</code> maps each <code>sid</code> to an object, say
     *     <code>iids</code>, containing source map information for the script whose id is <code>sid</code>.
     *     <code>iids</code> has the following properties: <code>"originalCodeFileName"</code> (stores the path of the original
     *     script file), <code>"instrumentedCodeFileName"</code> (stores the path of the instrumented script file),
     *     <code>"url"</code> (is optional and stores the URL of the script if it is set during instrumentation
     *     using the --url option),
     *     <code>"evalSid"</code> (stores the sid of the script in which the eval is called in case the current script comes from
     *     an <code>eval</code> function call),
     *     <code>"evalIid"</code> (iid of the <code>eval</code> function call in case the current script comes from an
     *     <code>eval</code> function call), <code>"nBranches"</code> (the number of conditional statements
     *     in the script),
     *     and <code>"code"</code> (a string denoting the original script code if the code is instrumented with the
     *     --inlineSource option).
     *     <code>iids</code> also maps each <code>iid</code> (which stands for instruction id, an unique id assigned
     *     to each callback function inserted by Jalangi2) to an array containing
     *     <code>[beginLineNumber, beginColumnNumber, endLineNumber, endColumnNumber]</code>.  The mapping from iids
     *     to arrays is only available if the code is instrumented with
     *     the --inlineIID option.
     * </p>
     * <p>
     *     In each callback described below, <code>iid</code> denotes the unique static instruction id of the callback in the script.
     *     Two callback functions inserted in two different scripts may have the same iid.  In a callback function, one can access
     *     the current script id using <code>J$.sid</code>.  One can call <code>J$.getGlobalIID(iid)</code> to get a string, called
     *     <code>giid</code>, that statically identifies the
     *     callback throughout the program.  <code>J$.getGlobalIID(iid)</code> returns the string <code>J$.sid+":"+iid</code>.
     *     <code>J$.iidToLocation(giid)</code> returns a string
     *     containing the original script file path, begin and end line numbers and column numbers of the code snippet
     *     for which the callback with <code>giid</code> was inserted.
     *
     * </p>
     * <p>
     *     A number of sample analyses can be found at {@link ../src/js/sample_analyses/}.  Refer to {@link ../README.md} for instructions
     *     on running an analysis.
     * </p>
     *
     *
     *
     * @global
     * @class
     */
    function DynamicAnalysisRuntimeTracer() {
        /**
         * This callback is called after a function, method, or constructor invocation.
         *
         * @example
         * x = y.f(a, b, c)
         *
         * // the above call roughly gets instrumented as follows:
         *
         * var skip = false;
         * var aret = analysis.invokeFunPre(113, f, y, [a, b, c], false, true);
         * if (aret) {
         *     f = aret.f;
         *     y = aret.y;
         *     args = aret.args;
         *     skip = aret.skip
         * }
         * if (!skip) {
         *     result =f.apply(y, args);
         * }
         * aret = analysis.invokeFun(117, f, y, args, result, false, true);
         * if (aret) {
         *     x = aret.result
         * } else {
         *     x = result;
         * }
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {function} f - The function object that was invoked
         * @param {*} base - The receiver object for the function <tt>f</tt>
         * @param {Array} args - The array of arguments passed to <tt>f</tt>
         * @param {*} result - The value returned by the invocation
         * @param {boolean} isConstructor - True if <tt>f</tt> is invoked as a constructor
         * @param {boolean} isMethod - True if <tt>f</tt> is invoked as a method
         * @param {number} functionIid - The iid (i.e. the unique instruction identifier) where the function was created
         * @param {number} functionSid - The sid (i.e. the unique script identifier) where the function was created
         * {@link MyAnalysis#functionEnter} when the function f is executed.  <tt>functionIid</tt> can be treated as the
         * static identifier of the function <tt>f</tt>.  Note that a given function code block can create several function
         * objects, but each such object has a common <tt>functionIid</tt>, which is the iid that is passed to
         * {@link MyAnalysis#functionEnter} when the function executes.
         * @returns {{result: *}| undefined} - If an object is returned, the return value of the invoked function is
         * replaced with the value stored in the <tt>result</tt> property of the object.  This enables one to change the
         * value that is returned by the actual function invocation.
         *
         */
        this.invokeFun = function (iid, f, base, args, result, isConstructor, isMethod, functionIid, functionSid) {
            logEvent("call", f.name || "anonymous", result);
            return {result: result};
        };

        /**
         * Note: we care about field accesses I think because it describes object's shape -- e.g. for duck typing
         */

        /**
         * This callback is called after a property of an object is accessed.
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {*} base - Base object
         * @param {string|*} offset - Property
         * @param {*} val - Value of <code>base[offset]</code>
         * @param {boolean} isComputed - True if property is accessed using square brackets.  For example,
         * <tt>isComputed</tt> is <tt>true</tt> if the get field operation is <tt>o[p]</tt>, and <tt>false</tt>
         * if the get field operation is <tt>o.p</tt>
         * @param {boolean} isOpAssign - True if the operation is of the form <code>o.p op= e</code>
         * @param {boolean} isMethodCall - True if the get field operation is part of a method call (e.g. <tt>o.p()</tt>)
         * @returns {{result: *} | undefined} - If an object is returned, the value of the get field operation  is
         * replaced with the value stored in the <tt>result</tt> property of the object.
         */
        this.getField = function (iid, base, offset, val, isComputed, isOpAssign, isMethodCall) {
            return {result: val};
        };

        /**
         * This callback is called after a property of an object is written.
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {*} base - Base object
         * @param {*} offset - Property
         * @param {*} val - Value to be stored in <code>base[offset]</code>
         * @param {boolean} isComputed - True if property is accessed using square brackets.  For example,
         * <tt>isComputed</tt> is <tt>true</tt> if the get field operation is <tt>o[p]</tt>, and <tt>false</tt>
         * if the get field operation is <tt>o.p</tt>
         * @param {boolean} isOpAssign - True if the operation is of the form <code>o.p op= e</code>
         * @returns {{result: *} | undefined} -   If an object is returned, the result of the put field operation is
         * replaced with the value stored in the <tt>result</tt> property of the object.
         */
        this.putField = function (iid, base, offset, val, isComputed, isOpAssign) {
            return {result: val};
        };

        /**
         * This callback is called before a variable is written.
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {string} name - Name of the variable being read
         * @param {*} val - Value to be written to the variable
         * @param {*} lhs - Value stored in the variable before the write operation
         * @param {boolean} isGlobal - True if the variable is not declared using <tt>var</tt> (e.g. <tt>console</tt>)
         * @param {boolean} isScriptLocal - True if the variable is declared in the global scope using <tt>var</tt>
         * @returns {{result: *} | undefined} - If an object is returned, the result of the write operation is
         * replaced with the value stored in the <tt>result</tt> property of the object.
         */
        this.write = function (iid, name, val, lhs, isGlobal, isScriptLocal) {
            if (isGlobal) {
                logEvent(TraceLogEntries.var_assign, name, val);
            }
            return {result: val};
        };

        /**
         * This callback is called before the execution of a function body starts.
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {function} f - The function object whose body is about to get executed
         * @param {*} dis - The value of the <tt>this</tt> variable in the function body
         * @param {Array} args - List of the arguments with which the function is called
         * @returns {undefined} - Any return value is ignored
         */
        this.functionEnter = function (iid, f, dis, args) {
            // TODO
            
        };

        /**
         * This callback is called when the execution of a function body completes
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {*} returnVal - The value returned by the function
         * @param {{exception:*} | undefined} wrappedExceptionVal - If this parameter is an object, the function
         * execution has thrown an uncaught exception and the exception is being stored in the <tt>exception</tt>
         * property of the parameter
         * @returns {{returnVal: *, wrappedExceptionVal: *, isBacktrack: boolean}}  If an object is returned, then the
         * actual <tt>returnVal</tt> and <tt>wrappedExceptionVal.exception</tt> are replaced with that from the
         * returned object. If an object is returned and the property <tt>isBacktrack</tt> is set, then the control-flow
         * returns to the beginning of the function body instead of returning to the caller.  The property
         * <tt>isBacktrack</tt> can be set to <tt>true</tt> to repeatedly execute the function body as in MultiSE
         * symbolic execution.
         */
        this.functionExit = function (iid, returnVal, wrappedExceptionVal) {
            // TODO
            logEvent()
            return {returnVal: returnVal, wrappedExceptionVal: wrappedExceptionVal, isBacktrack: false};
        };

        /**
         * This callback is called before the execution of a JavaScript file
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {string} instrumentedFileName - Name of the instrumented script file
         * @param {string} originalFileName - Name of the original script file
         */
        this.scriptEnter = function (iid, instrumentedFileName, originalFileName) {
            currentFileName = originalFileName;
        };

        /**
         * This callback is called when the execution of a JavaScript file completes
         *
         * @param {number} iid - Static unique instruction identifier of this callback
         * @param {{exception:*} | undefined} wrappedExceptionVal - If this parameter is an object, the script
         * execution has thrown an uncaught exception and the exception is being stored in the <tt>exception</tt>
         * property of the parameter
         * @returns {{wrappedExceptionVal: *, isBacktrack: boolean}} - If an object is returned, then the
         * actual <tt>wrappedExceptionVal.exception</tt> is replaced with that from the
         * returned object. If an object is returned and the property <tt>isBacktrack</tt> is set, then the control-flow
         * returns to the beginning of the script body.  The property
         * <tt>isBacktrack</tt> can be set to <tt>true</tt> to repeatedly execute the script body as in MultiSE
         * symbolic execution.
         */
        this.scriptExit = function (iid, wrappedExceptionVal) {
            currentFileName = '';
            return {wrappedExceptionVal: wrappedExceptionVal, isBacktrack: false};
        };

        /**
         * This callback is called when an execution terminates in node.js.  In a browser environment, the callback is
         * called if ChainedAnalyses.js or ChainedAnalysesNoCheck.js is used and Alt-Shift-T is pressed.
         *
         * @returns {undefined} - Any return value is ignored
         */
        this.endExecution = function () {
            flush();
            stream.end();
            console.log("Analysis complete");
        };
    }

    sandbox.analysis = new DynamicAnalysisRuntimeTracer();
})(J$);
