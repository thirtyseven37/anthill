import * as R from "ramda";
import { Observable } from "@reactivex/rxjs";
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
  const results = sourceObject;

  const fetchPayloadForSingleArg = (arg: AntResultDefinitionArgument | undefined) => (undefined !== arg && results[arg.name])
    ? results[arg.name].map((el: any) => el.payload)
    : Observable.empty();

  const validResultDefArgsToPayload = (resultDefinition: AntResultDefinition) => resultDefinition.args
    .map(validSingleArg(config))
    .map(fetchPayloadForSingleArg);

  resultDefinitions
    .filter(validDefinition(config))
    .forEach((resultDefinition) => {
      const singleDefinitionResult$ = Observable.zip(...validResultDefArgsToPayload(resultDefinition))
        .map(getHandlerFromResultDefinition(resultDefinition, config))
        .share();

      resultDefinition.parts.forEach((part: AntResultDefinitionPart, index) =>
        results[part.name] = resultForDefinitionFromPart(singleDefinitionResult$, part, index)
      );
    });

  return results;
};

export const mapSingleSourceToSourceObject = (source$: Observable<AntSourceEvent>, definitions: AntSourceDefinition[], config: AntAdditionalConfig = {}): any => {
  const shared$ = source$.share();

  return definitions
    .map(mapSingleEventToStream(shared$, config))
    .reduce((acc: any, { stream$, name }) => acc[name] = stream$, {});
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

const validDefinition = (config: AntAdditionalConfig) => (resultDefinition: AntResultDefinition) => {
  const args = (config.argsToCheckFunctions && config.argsToCheckFunctions.length > 0)
    ? config.argsToCheckFunctions
    : [];

  return !resultDefinition.check || resultDefinition.check(...args);
};

const validSingleArg = (config: AntAdditionalConfig) => (resultDefinitionArgument: AntResultDefinitionArgument) =>  {
  const tmpArgs = (config.argsToCheckFunctions && config.argsToCheckFunctions.length > 0)
    ? config.argsToCheckFunctions
    : [];

  return !resultDefinitionArgument.check || resultDefinitionArgument.check(...tmpArgs)
    ? resultDefinitionArgument
    : undefined;
};

const mapSingleEventToStream = R.curry((shared$: Observable<AntSourceEvent>, config: AntAdditionalConfig, definition: AntSourceDefinition): { stream$: Observable<any>, name: string } => {
  let stream$ = shared$
    .filter((sourceEvent: AntSourceEvent) => sourceEvent.name === definition.name)
    .map(buildResultFromSourceEvent(definition))
    .map(runModifiers(definition, config));

  if (definition.hasOwnProperty("ifMissing")) {
    stream$ = stream$.defaultIfEmpty({
      name: definition.name,
      payload: definition.ifMissing,
      toResult: definition.toResult ? definition.toResult : false
    });
  }

  const name = definition.name;

  return {stream$: stream$.share(), name};
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

const buildResultDefinitionObject = R.curry((part: any, payload: any) => {
  return {
    name: part.name,
    payload,
    toResult: part.toResult ? part.toResult : false
  };
});

const resultForDefinitionFromPart = (singleDefinitionResult$: any, part: AntResultDefinitionPart, index: any) => {
  let resultForDefinition$ = singleDefinitionResult$.map((resultArray: any) => resultArray[index]);

  if (part.hasOwnProperty("ifMissing")) {
    resultForDefinition$ = resultForDefinition$.defaultIfEmpty(part.ifMissing);
  }

  return resultForDefinition$.map(buildResultDefinitionObject(part)).share();
};

const buildResultFromSourceEvent = R.curry((definition: AntSourceDefinition, sourceEvent: AntSourceEvent) => {
  return {
    ...sourceEvent,
    toResult: definition.toResult ? definition.toResult : false
  };
});
