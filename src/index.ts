import { from, Observable, Subject } from "rxjs";
import { map, flatMap, filter, mergeAll } from "rxjs/operators";

import * as mapper from "./mappers";
import { filterResult } from "./mappers";

export interface AntSourceDefinition {
  name: string;
  modifiers?: Array<(...params: any[]) => any>;
  toResult?: boolean | ((...params: any[]) => boolean);
  ifMissing?: any;
}

export interface AntResultDefinitionPart {
  name: string;
  toResult?: boolean | ((...params: any[]) => boolean);
  ifMissing?: any;
}

export interface AntResultDefinition {
  check?: (...params: any[]) => boolean;
  parts: AntResultDefinitionPart[];
  args: AntResultDefinitionArgument[];
  handler: (...params: any[]) => any;
}

export interface AntResultDefinitionArgument {
  name: string;
  check?: (...params: any[]) => boolean;
}

export interface AntConfig {
  sources: AntSourceDefinition[];
  results: AntResultDefinition[];
  additionalConfig?: AntAdditionalConfig;
}

export interface AntSourceEvent {
  name: string;
  payload: any;
}

export interface AntEvent extends AntSourceEvent {
  toResult: (...fnArgs: any[]) => boolean | boolean;
}

export interface AntAdditionalConfig {
  argsToCheckFunctions?: any[];
  argsToHandlers?: any[];
  argsToModifiers?: any[];
  argsToResultFunctions?: any[];
}

export const fromObservable = (source$: Observable<AntSourceEvent>, config: AntConfig): Observable<AntEvent> => {
  // validate configs
  const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources, config.additionalConfig);
  const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results, config.additionalConfig);

  return from(Object.entries(resultObject)).pipe(
    map((el: any) => el[1] as Observable<AntEvent>),
    mergeAll(),
    filter(filterResult(config.additionalConfig))
  );
};

export const fromPromise = (source: Promise<AntSourceEvent[]>, config: AntConfig): Observable<AntEvent> => {
  const source$: Subject<AntSourceEvent> = new Subject();

  const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources);
  const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results);

  const result$ = from(Object.entries({ ...sourceObject, ...resultObject })).pipe(
    map((el) => el[1] as Observable<AntEvent>),
    mergeAll(),
    filter((el: any) => el.toResult)
  );

  from(source)
    .pipe(flatMap((el) => el))
    .subscribe(source$);

  return result$;
};
