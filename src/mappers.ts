import * as R from "ramda";
import { Observable } from "@reactivex/rxjs";
import { AntResultDefinition, AntResultDefinitionPart, AntSourceDefinition, AntSourceEvent } from "./index";

/*
|--------------------------------------------------------------------------
| Exported functions
|--------------------------------------------------------------------------
*/

export const mapResultsDefinitionsToSourceObject = (sourceObject: any, resultDefinitions: AntResultDefinition[]): any => {
  const results: any = [];

  resultDefinitions
    .filter((resultDefinition) => !resultDefinition.check || resultDefinition.check())
    .forEach((resultDefinition) => {
      const args: Array<Observable<any>> = resultDefinition.args.map((arg) => {
        if (sourceObject[arg]) {
          return sourceObject[arg].map((el: any) => el.payload);
        } else if (results[arg]) {
          return results[arg].map((el: any) => el.payload);
        } else {
          return Observable.empty();
        }
      });

      const singleDefinitionResult$ = Observable
        .zip(...args)
        .map(getHandlerFromResultDefinition(resultDefinition));

      resultDefinition.parts.forEach((part: AntResultDefinitionPart, index) => {
        let resultForDefinition$ = singleDefinitionResult$.map((resultArray: any) => resultArray[index]);

        if (part.hasOwnProperty("ifMissing")) {
          resultForDefinition$ = resultForDefinition$.defaultIfEmpty(part.ifMissing);
        }

        resultForDefinition$ = resultForDefinition$.map(buildResultDefinitionObject(part)).share();
        results[part.name] = resultForDefinition$;
      });
    });

  return results;
};

export const mapSingleSourceToSourceObject = (source$: Observable<AntSourceEvent>, definitions: AntSourceDefinition[]): any => {
  const shared$ = source$.share();

  return definitions
    .map(mapSingleEventToStream(shared$))
    .reduce((acc: any, { stream$, name }) => {
      acc[name] = stream$;
      return acc;
    }, {});
};

/*
|--------------------------------------------------------------------------
| Private functions
|--------------------------------------------------------------------------
*/

const mapSingleEventToStream = R.curry((shared$: Observable<AntSourceEvent>, definition: AntSourceDefinition): { stream$: Observable<any>, name: string } => {
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
});

const getHandlerFromResultDefinition = R.curry((resultDefinition: any, argsAsValues: any): any => {
  const handlerResult = resultDefinition.handler(...argsAsValues);

  if (resultDefinition.parts.length !== handlerResult.length) {
    throw new Error(`[00] WRONG HANDLER RESULT LENGTH (${handlerResult.length}) FOR ${JSON.stringify(resultDefinition.parts.map((el: any) => el.name))}`);
  }

  return handlerResult;
});

const buildResultDefinitionObject = R.curry((part: any, payload: any) => {
  return {
    name: part.name,
    payload,
    toResult: part.toResult === undefined ? true : part.toResult
  };
});
