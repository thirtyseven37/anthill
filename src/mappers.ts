import * as R from "ramda";
import { Observable, from, zip, EMPTY } from "rxjs";
import { map, filter, share, defaultIfEmpty } from "rxjs/operators";

import {
  AntAdditionalConfig, AntEvent, AntResultDefinition, AntResultDefinitionArgument, AntResultDefinitionPart,
  AntSourceDefinition,
  AntSourceEvent
} from "./index";

/*
|--------------------------------------------------------------------------
| Exported functions
|--------------------------------------------------------------------------
*/

export const mapResultsDefinitionsToSourceObject = (sourceObject: any, resultDefinitions: AntResultDefinition[], config: AntAdditionalConfig = {}): any => {
  const results: any = sourceObject;

  resultDefinitions
    .filter((resultDefinition) => {
      let args = [];
      if (config.argsToCheckFunctions && config.argsToCheckFunctions.length > 0) {
        args = config.argsToCheckFunctions;
      }
      return !resultDefinition.check || resultDefinition.check(...args);
    })
    .forEach((resultDefinition) => {
      const args: Array<Observable<any>> = resultDefinition.args
        .map((resultDefinitionArgument: AntResultDefinitionArgument) => {
          let argsArr = [];

          if (config.argsToCheckFunctions && config.argsToCheckFunctions.length > 0) {
            argsArr = config.argsToCheckFunctions;
          }

          return !resultDefinitionArgument.check || resultDefinitionArgument.check(...argsArr)
            ? resultDefinitionArgument
            : undefined;
        })
        .map((arg: AntResultDefinitionArgument | undefined) => {
          if (arg === undefined) {
            return from([undefined]);
          }

          if (results[arg.name]) {
            return results[arg.name].pipe(map((el: any) => el.payload));
          }

          return EMPTY;
        });

      const singleDefinitionResult$ = zip(...args)
        .pipe(
          map(getHandlerFromResultDefinition(resultDefinition, config)),
          share()
        );

      resultDefinition.parts.forEach(
        (part: AntResultDefinitionPart, index) => results[part.name] = resultForDefinitionFromPart(
          singleDefinitionResult$,
          part,
          index
        )
      );
    });

  return results;
};

export const mapSingleSourceToSourceObject = (source$: Observable<AntSourceEvent>, definitions: AntSourceDefinition[], config: AntAdditionalConfig = {}): any => {
  const shared$ = source$.pipe(share());

  return definitions
    .map(mapSingleEventToStream(shared$, config))
    .reduce((acc: any, {stream$, name}) => {
      acc[name] = stream$;
      return acc;
    }, {});
};

export const filterResult = (config: AntAdditionalConfig = {}): ((antEvent: AntEvent) => boolean) => {
  return (antEvent: AntEvent): boolean => {
    if (typeof antEvent.toResult === "function") {
      let args: any[] = [];

      if (config.argsToResultFunctions && config.argsToResultFunctions.length > 0) {
        args = [...config.argsToResultFunctions, ...args] as any;
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

const mapSingleEventToStream = R.curry((shared$: Observable<AntSourceEvent>, config: AntAdditionalConfig, definition: AntSourceDefinition): { stream$: Observable<any>, name: string } => {
  let stream$ = shared$.pipe(
    filter((sourceEvent: AntSourceEvent) => sourceEvent.name === definition.name),
    map(buildResultFromSourceEvent(definition)),
    map(runModifiers(definition, config))
  );

  if (definition.hasOwnProperty("ifMissing")) {
    stream$ = stream$.pipe(
      defaultIfEmpty({
        name: definition.name,
        payload: definition.ifMissing,
        toResult: definition.toResult ? definition.toResult : false
      })
    );
  }

  const name = definition.name;

  return {stream$: stream$.pipe(share()), name};
});

const runModifiers = R.curry((definition: AntSourceDefinition, config: AntAdditionalConfig, sourceEvent: any) => {
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

const getHandlerFromResultDefinition = R.curry((resultDefinition: any, config: AntAdditionalConfig, argsAsValues: any): any => {
  let args = argsAsValues;

  if (config.argsToHandlers && config.argsToHandlers.length > 0) {
    args = [...config.argsToHandlers, ...argsAsValues];
  }

  const handlerResult = resultDefinition.handler(...args);

  if (resultDefinition.parts.length !== handlerResult.length) {
    throw new Error(`[00] WRONG HANDLER RESULT LENGTH (${handlerResult.length}) FOR ${JSON.stringify(resultDefinition.parts.map((el: any) => el.name))}`);
  }

  return handlerResult;
});

const buildResultDefinitionObject = R.curry((part: any, payload: any) => ({
  name: part.name,
  payload,
  toResult: part.toResult ? part.toResult : false
}));

const resultForDefinitionFromPart = (singleDefinitionResult$: any, part: AntResultDefinitionPart, index: any) => {
  let resultForDefinition$ = singleDefinitionResult$.pipe(map((resultArray: any) => resultArray[index]));

  if (part.hasOwnProperty("ifMissing")) {
    resultForDefinition$ = resultForDefinition$.pipe(defaultIfEmpty(part.ifMissing));
  }

  return resultForDefinition$.pipe(
    map(buildResultDefinitionObject(part)),
    share()
  );
};

const buildResultFromSourceEvent = R.curry((definition: AntSourceDefinition, sourceEvent: AntSourceEvent) => ({
  ...sourceEvent,
  toResult: definition.toResult ? definition.toResult : false
}));
