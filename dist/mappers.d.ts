import { Observable } from "@reactivex/rxjs";
import { AntAdditionalConfig, AntEvent, AntResultDefinition, AntSourceDefinition, AntSourceEvent } from "./index";
export declare const mapResultsDefinitionsToSourceObject: (sourceObject: any, resultDefinitions: AntResultDefinition[], config?: AntAdditionalConfig) => any;
export declare const mapSingleSourceToSourceObject: (source$: Observable<AntSourceEvent>, definitions: AntSourceDefinition[], config?: AntAdditionalConfig) => any;
export declare const filterResult: (config?: AntAdditionalConfig) => (antEvent: AntEvent) => boolean;
