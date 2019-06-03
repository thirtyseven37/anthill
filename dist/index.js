"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const mapper = require("./mappers");
const mappers_1 = require("./mappers");
exports.fromObservable = (source$, config) => {
    // validate configs
    const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources, config.additionalConfig);
    const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results, config.additionalConfig);
    return rxjs_1.from(Object.entries(resultObject)).pipe(operators_1.map((el) => el[1]), operators_1.mergeAll(), operators_1.filter(mappers_1.filterResult(config.additionalConfig)));
};
exports.fromPromise = (source, config) => {
    const source$ = new rxjs_1.Subject();
    const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources);
    const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results);
    const result$ = rxjs_1.from(Object.entries(Object.assign({}, sourceObject, resultObject))).pipe(operators_1.map((el) => el[1]), operators_1.mergeAll(), operators_1.filter((el) => el.toResult));
    rxjs_1.from(source)
        .pipe(operators_1.flatMap((el) => el))
        .subscribe(source$);
    return result$;
};
//# sourceMappingURL=index.js.map