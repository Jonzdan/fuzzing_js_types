const estraverse = require("estraverse");
const { CATEGORY } = require("../dist/src/constants");

module.exports = function (ast) {
    /**
     * Instruments exposed __jalangi__.js file from test file
     */
    const topLevelVariables = new Set(
        Object.entries(ast.scope.vars)
            .filter((value) => value[1] === 'var')
            .map(([name]) => name)
    );
    
    const functions = new Set();
    estraverse.traverse(ast, {
        enter(node) {
            if (node.type === "FunctionDeclaration") {
                functions.add(node.id.name);
            }
        }
    });


    console.log(topLevelVariables, functions);
    const scopeMap = {};
    
    /**
     * Notes for Jalangi's AST - Relevant Methods:
     * $J.N -- tracks new invocation -- TODO later; different handling method
     * $J.W -- tracks writes (potentially to variables)
     * $J.F -- tracks function invocations
     */
    estraverse.traverse(ast, {
        enter(node, parent) {
            if (node.type === "MemberExpression") {
                const { object: { type: objectType, name: objectName }, property: { type: propertyType, name: propertyName } } = node;
                if ((objectType !== propertyType && propertyType  !== "Identifier") || objectName !== "J$" || ['W', 'F'].indexOf(propertyName) === -1) {
                    return;
                }

                if (!parent?.arguments[0]) {
                    return;
                }

                const iid = parent.arguments[0].value;

                let identifier;
                switch (propertyName) {
                    case "W":
                        identifier = parent.arguments[1].value;
                        break;
                    case "F":
                        if (!parent.arguments[1]?.arguments) {
                            throw new Error("Line 52 assumption of valid thing is faulty");
                        }
                        identifier = parent.arguments[1].arguments[1].value;
                        break;
                }

                if (!topLevelVariables.has(identifier) && !functions.has(identifier)) {
                    return;
                }

                if (iid in scopeMap) {
                    throw new Error("Duplicate iid processing", iid);
                }

                /**
                 * Functions and global variables could technically have same names (smaller scoped functions & global variables).
                 * We leave differentiation up to actual instrumentation calls during runtime. Instrumentation has iid, which will match the iids here.
                 * Technically, if property == 'F', we know it's a function, but W (writes) could still overwrite a function?
                 * Obviously need to serialize this AST somehow
                 */
                scopeMap[iid] = {
                    name: identifier,
                    potentialVariable: { ...(topLevelVariables.has(identifier) && { node: parent }) },
                    potentialFunction: { ...(functions.has(identifier) && { node: parent }) },
                };

            }
        }
    });
    return scopeMap;
};
