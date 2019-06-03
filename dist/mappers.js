"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const R = require("ramda");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
/*
|--------------------------------------------------------------------------
| Exported functions
|--------------------------------------------------------------------------
*/
exports.mapResultsDefinitionsToSourceObject = (sourceObject, resultDefinitions, config = {}) => {
    const results = sourceObject;
    resultDefinitions
        .filter((resultDefinition) => {
        let args = [];
        if (config.argsToCheckFunctions && config.argsToCheckFunctions.length > 0) {
            args = config.argsToCheckFunctions;
        }
        return !resultDefinition.check || resultDefinition.check(...args);
    })
        .forEach((resultDefinition) => {
        const args = resultDefinition.args
            .map((resultDefinitionArgument) => {
            let argsArr = [];
            if (config.argsToCheckFunctions && config.argsToCheckFunctions.length > 0) {
                argsArr = config.argsToCheckFunctions;
            }
            return !resultDefinitionArgument.check || resultDefinitionArgument.check(...argsArr)
                ? resultDefinitionArgument
                : undefined;
        })
            .map((arg) => {
            if (arg === undefined) {
                return rxjs_1.from([undefined]);
            }
            if (results[arg.name]) {
                return results[arg.name].pipe(operators_1.map((el) => el.payload));
            }
            return rxjs_1.EMPTY;
        });
        const singleDefinitionResult$ = rxjs_1.zip(...args)
            .pipe(operators_1.map(getHandlerFromResultDefinition(resultDefinition, config)), operators_1.share());
        resultDefinition.parts.forEach((part, index) => results[part.name] = resultForDefinitionFromPart(singleDefinitionResult$, part, index));
    });
    return results;
};
exports.mapSingleSourceToSourceObject = (source$, definitions, config = {}) => {
    const shared$ = source$.pipe(operators_1.share());
    return definitions
        .map(mapSingleEventToStream(shared$, config))
        .reduce((acc, { stream$, name }) => {
        acc[name] = stream$;
        return acc;
    }, {});
};
exports.filterResult = (config = {}) => {
    return (antEvent) => {
        if (typeof antEvent.toResult === "function") {
            let args = [];
            if (config.argsToResultFunctions && config.argsToResultFunctions.length > 0) {
                args = [...config.argsToResultFunctions, ...args];
            }
            return antEvent.toResult(...args);
        }
        return antEvent.toResult;
    };
};
/*
|--------------------------------------------------------------------------
| Private functions
|--------------------------------------------------------------------------
*/
const mapSingleEventToStream = R.curry((shared$, config, definition) => {
    let stream$ = shared$.pipe(operators_1.filter((sourceEvent) => sourceEvent.name === definition.name), operators_1.map(buildResultFromSourceEvent(definition)), operators_1.map(runModifiers(definition, config)));
    if (definition.hasOwnProperty("ifMissing")) {
        stream$ = stream$.pipe(operators_1.defaultIfEmpty({
            name: definition.name,
            payload: definition.ifMissing,
            toResult: definition.toResult ? definition.toResult : false
        }));
    }
    const name = definition.name;
    return { stream$: stream$.pipe(operators_1.share()), name };
});
const runModifiers = R.curry((definition, config, sourceEvent) => {
    if (!definition.modifiers) {
        return sourceEvent;
    }
    const newEvent = definition.modifiers.reduce((prevResult, modifier) => {
        let args = [prevResult];
        if (config.argsToModifiers && config.argsToModifiers.length > 0) {
            args = [...config.argsToModifiers, ...args];
        }
        return modifier(...args);
    }, sourceEvent);
    return newEvent;
});
const getHandlerFromResultDefinition = R.curry((resultDefinition, config, argsAsValues) => {
    let args = argsAsValues;
    if (config.argsToHandlers && config.argsToHandlers.length > 0) {
        args = [...config.argsToHandlers, ...argsAsValues];
    }
    const handlerResult = resultDefinition.handler(...args);
    if (resultDefinition.parts.length !== handlerResult.length) {
        throw new Error(`[00] WRONG HANDLER RESULT LENGTH (${handlerResult.length}) FOR ${JSON.stringify(resultDefinition.parts.map((el) => el.name))}`);
    }
    return handlerResult;
});
const buildResultDefinitionObject = R.curry((part, payload) => ({
    name: part.name,
    payload,
    toResult: part.toResult ? part.toResult : false
}));
const resultForDefinitionFromPart = (singleDefinitionResult$, part, index) => {
    let resultForDefinition$ = singleDefinitionResult$.pipe(operators_1.map((resultArray) => resultArray[index]));
    if (part.hasOwnProperty("ifMissing")) {
        resultForDefinition$ = resultForDefinition$.pipe(operators_1.defaultIfEmpty(part.ifMissing));
    }
    return resultForDefinition$.pipe(operators_1.map(buildResultDefinitionObject(part)), operators_1.share());
};
const buildResultFromSourceEvent = R.curry((definition, sourceEvent) => (Object.assign({}, sourceEvent, { toResult: definition.toResult ? definition.toResult : false })));
//# sourceMappingURL=mappers.js.map