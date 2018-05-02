import { Observable } from "@reactivex/rxjs";
import { AntResultDefinition, AntSourceDefinition, AntSourceEvent } from "./index";
export declare const mapResultsDefinitionsToSourceObject: (sourceObject: any, resultDefinitions: AntResultDefinition[]) => any;
export declare const mapSingleSourceToSourceObject: (source$: Observable<AntSourceEvent>, definitions: AntSourceDefinition[]) => any;
export declare const mapSingleEventToStream: (shared$: Observable<AntSourceEvent>) => (definition: AntSourceDefinition) => {
    stream$: Observable<any>;
    name: string;
};
