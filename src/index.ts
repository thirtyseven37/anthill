import {
  AntConfig, AntResultDefinition, AntResultDefinitionPart, AntResultEvent, AntSourceDefinition,
  AntSourceEvent
} from "./types";
import { Observable, Subject } from "@reactivex/rxjs";

export const fromObservable = (source$: Observable<AntSourceEvent>, config: AntConfig): Observable<AntResultEvent> => {
  // validate configs
  const sourceObject = mapSingleSourceToSourceObject(source$, config.sources);
  const resultObject = mapResultsDefinitionsToSourceObject(sourceObject, config.results);
  // const products$ = sourceObject['products']
  //   .subscribe(console.log, console.error, () => { console.log('FINISHED') });

  const result$ = Observable
    .from(Object.entries({ ...sourceObject, ...resultObject }))
    .map((el): Observable<AntResultEvent> => {
      return el[1];
    })
    .mergeAll()
    .filter((el: any) => el.toResult);

  return result$;
};

export const fromPromise = (source: Promise<AntSourceEvent[]>, config: AntConfig): Observable<AntResultEvent> => {
  const source$: Subject<AntSourceEvent> = new Subject();

  const sourceObject = mapSingleSourceToSourceObject(source$, config.sources);
  const resultObject = mapResultsDefinitionsToSourceObject(sourceObject, config.results);
  // const products$ = sourceObject['products']
  //   .subscribe(console.log, console.error, () => { console.log('FINISHED') });

  const result$ = Observable
    .from(Object.entries({ ...sourceObject, ...resultObject }))
    .map((el): Observable<AntResultEvent> => {
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

const mapResultsDefinitionsToSourceObject = (sourceObject: any, resultDefinitions: AntResultDefinition[]): any => {
  const results: any = [];

  resultDefinitions
    .filter((resultDefinition) => !resultDefinition.check || resultDefinition.check())
    .forEach((resultDefinition) => {
      const args: Array<Observable<any>> = resultDefinition.args.map((arg) => {
        if (sourceObject[arg]) {
          return sourceObject[arg].map((el: any) => {
            return el.payload;
          });
        } else if (results[arg]) {
          return results[arg].map((el: any) => {
            return el.payload;
          });
        } else {
          return Observable.empty();
        }
      });

      const singleDefinitionResult$ = Observable
        .zip(...args)
        .map((argsAsValues) => {
          const handlerResult = resultDefinition.handler(...argsAsValues);
          if (resultDefinition.parts.length !== handlerResult.length) {
            throw new Error(`[00] WRONG HANDLER RESULT LENGTH (${handlerResult.length}) FOR ${JSON.stringify(resultDefinition.parts.map(el => el.name))}`);
          }

          return handlerResult;
        });

      resultDefinition.parts
        .forEach((part: AntResultDefinitionPart, index) => {
          let resultForDefinition$ = singleDefinitionResult$
            .map((resultArray) => resultArray[index]);

          if (part.hasOwnProperty("ifMissing")) {
            resultForDefinition$ = resultForDefinition$
              .defaultIfEmpty(part.ifMissing);
          }

          resultForDefinition$ = resultForDefinition$.map((payload) => {
              return { name: part.name, payload, toResult: part.toResult === undefined ? true : part.toResult }
            })
            .share();

          results[part.name] = resultForDefinition$;
        });
    });

  return results;
};

const mapSingleSourceToSourceObject = (source$: Observable<AntSourceEvent>, definitions: AntSourceDefinition[]): any => {
  const shared$ = source$.share();

  return definitions
    .map(mapSingleEventToStream(shared$))
    .reduce((acc: any, { stream$, name }) => {
      acc[name] = stream$;
      return acc;
    }, {});
};

const mapSingleEventToStream = (shared$: Observable<AntSourceEvent>) => {
  return (definition: AntSourceDefinition): { stream$: Observable<any>, name: string } => {
    let stream$ = shared$
      .filter((sourceEvent: AntSourceEvent) => sourceEvent.name === definition.name)
      .map((sourceEvent: AntSourceEvent) => {
        return {
          ...sourceEvent,
          toResult: definition.toResult ? definition.toResult : false
        };
      });

    stream$ = stream$
      .map((sourceEvent: any) => {
        const payload = sourceEvent.payload;
        if (!definition.modifiers) {
          return sourceEvent;
        }

        const newPayload = definition.modifiers.reduce((prevResult, modifier) => {
          return modifier(prevResult);
        }, payload);

        return {
          ...sourceEvent,
          payload: newPayload
        };
      });

    if (definition.hasOwnProperty("ifMissing")) {
      stream$ = stream$
        .defaultIfEmpty({ name: definition.name, payload: definition.ifMissing, toResult: definition.toResult ? definition.toResult : false});
    }

    const name = definition.name;

    return {stream$, name};
  };
};
