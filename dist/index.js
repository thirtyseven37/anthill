"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("@reactivex/rxjs");
exports.fromObservable = (source$, config) => {
    // validate configs
    const sourceObject = mapSingleSourceToSourceObject(source$, config.sources);
    const resultObject = mapResultsDefinitionsToSourceObject(sourceObject, config.results);
    // const products$ = sourceObject['products']
    //   .subscribe(console.log, console.error, () => { console.log('FINISHED') });
    const result$ = rxjs_1.Observable
        .from(Object.entries(Object.assign({}, sourceObject, resultObject)))
        .map((el) => {
        return el[1];
    })
        .mergeAll()
        .filter((el) => el.toResult);
    return result$;
};
exports.fromPromise = (source, config) => {
    const source$ = new rxjs_1.Subject();
    const sourceObject = mapSingleSourceToSourceObject(source$, config.sources);
    const resultObject = mapResultsDefinitionsToSourceObject(sourceObject, config.results);
    // const products$ = sourceObject['products']
    //   .subscribe(console.log, console.error, () => { console.log('FINISHED') });
    const result$ = rxjs_1.Observable
        .from(Object.entries(Object.assign({}, sourceObject, resultObject)))
        .map((el) => {
        return el[1];
    })
        .mergeAll()
        .filter((el) => el.toResult);
    rxjs_1.Observable
        .fromPromise(source)
        .flatMap((el) => el)
        .subscribe((value) => source$.next(value), (error) => source$.error(error), () => source$.complete());
    return result$;
};
const mapResultsDefinitionsToSourceObject = (sourceObject, resultDefinitions) => {
    const results = [];
    resultDefinitions
        .filter((resultDefinition) => !resultDefinition.check || resultDefinition.check())
        .forEach((resultDefinition) => {
        const args = resultDefinition.args.map((arg) => {
            if (sourceObject[arg]) {
                return sourceObject[arg].map((el) => {
                    return el.payload;
                });
            }
            else if (results[arg]) {
                return results[arg].map((el) => {
                    return el.payload;
                });
            }
            else {
                return rxjs_1.Observable.empty();
            }
        });
        const singleDefinitionResult$ = rxjs_1.Observable
            .zip(...args)
            .map((argsAsValues) => {
            const handlerResult = resultDefinition.handler(...argsAsValues);
            if (resultDefinition.parts.length !== handlerResult.length) {
                throw new Error(`[00] WRONG HANDLER RESULT LENGTH (${handlerResult.length}) FOR ${JSON.stringify(resultDefinition.parts.map(el => el.name))}`);
            }
            return handlerResult;
        });
        resultDefinition.parts
            .forEach((part, index) => {
            let resultForDefinition$ = singleDefinitionResult$
                .map((resultArray) => resultArray[index]);
            if (part.hasOwnProperty("ifMissing")) {
                resultForDefinition$ = resultForDefinition$
                    .defaultIfEmpty(part.ifMissing);
            }
            resultForDefinition$ = resultForDefinition$.map((payload) => {
                return { name: part.name, payload, toResult: part.toResult === undefined ? true : part.toResult };
            })
                .share();
            results[part.name] = resultForDefinition$;
        });
    });
    return results;
};
const mapSingleSourceToSourceObject = (source$, definitions) => {
    const shared$ = source$.share();
    return definitions
        .map(mapSingleEventToStream(shared$))
        .reduce((acc, { stream$, name }) => {
        acc[name] = stream$;
        return acc;
    }, {});
};
const mapSingleEventToStream = (shared$) => {
    return (definition) => {
        let stream$ = shared$
            .filter((sourceEvent) => sourceEvent.name === definition.name)
            .map((sourceEvent) => {
            return Object.assign({}, sourceEvent, { toResult: definition.toResult ? definition.toResult : false });
        });
        stream$ = stream$
            .map((sourceEvent) => {
            const payload = sourceEvent.payload;
            if (!definition.modifiers) {
                return sourceEvent;
            }
            const newPayload = definition.modifiers.reduce((prevResult, modifier) => {
                return modifier(prevResult);
            }, payload);
            return Object.assign({}, sourceEvent, { payload: newPayload });
        });
        if (definition.hasOwnProperty("ifMissing")) {
            stream$ = stream$
                .defaultIfEmpty({ name: definition.name, payload: definition.ifMissing, toResult: definition.toResult ? definition.toResult : false });
        }
        const name = definition.name;
        return { stream$, name };
    };
};
//# sourceMappingURL=index.js.map