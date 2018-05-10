import { Observable } from "@reactivex/rxjs";
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
export declare const fromObservable: (source$: Observable<AntSourceEvent>, config: AntConfig) => Observable<AntEvent>;
export declare const fromPromise: (source: Promise<AntSourceEvent[]>, config: AntConfig) => Observable<AntEvent>;
