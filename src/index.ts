import * as mapper from "./mappers";
import { Observable, Subject } from "@reactivex/rxjs";

export interface AntSourceDefinition {
  name: string;
  modifiers?: Array<(...params: any[]) => any>;
  toResult?: boolean;
  ifMissing?: any;
}

export interface AntResultDefinitionPart {
  name: string;
  toResult?: boolean;
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
  toResult: boolean;
}

export interface AntAdditionalConfig {
  argsToCheckFunctions?: any[];
  argsToHandlers?: any[];
  argsToModifiers?: any[];
}

export const fromObservable = (source$: Observable<AntSourceEvent>, config: AntConfig): Observable<AntEvent> => {
  // validate configs
  const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources, config.additionalConfig);
  const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results, config.additionalConfig);

  // const products$ = sourceObject['products']
  //   .subscribe(console.log, console.error, () => { console.log('FINISHED') });

  const result$ = Observable
    .from(Object.entries(resultObject))
    .map((el): Observable<AntEvent> => {
      return el[1];
    })
    .mergeAll()
    .filter((el: any) => el.toResult);

  return result$;
};

export const fromPromise = (source: Promise<AntSourceEvent[]>, config: AntConfig): Observable<AntEvent> => {
  const source$: Subject<AntSourceEvent> = new Subject();

  const sourceObject = mapper.mapSingleSourceToSourceObject(source$, config.sources);
  const resultObject = mapper.mapResultsDefinitionsToSourceObject(sourceObject, config.results);
  // const products$ = sourceObject['products']
  //   .subscribe(console.log, console.error, () => { console.log('FINISHED') });

  const result$ = Observable
    .from(Object.entries({ ...sourceObject, ...resultObject }))
    .map((el): Observable<AntEvent> => {
      return el[1];
    })
    .mergeAll()
    .filter((el: any) => el.toResult);

  Observable
    .fromPromise(source)
    .flatMap((el) => el)
    .subscribe(
      (value) => source$.next(value),
      (error) => source$.error(error),
      () => source$.complete()
    );

  return result$;
};
