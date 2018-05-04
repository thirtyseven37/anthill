"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mapper = require("./mappers");
const rxjs_1 = require("@reactivex/rxjs");
exports.fromObservable = (source$, config) => {
    // validate configs
    const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources, config.additionalConfig);
    const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results, config.additionalConfig);
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
    const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources);
    const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results);
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
//# sourceMappingURL=index.js.map