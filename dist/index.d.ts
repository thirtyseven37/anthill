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
    check?: () => boolean;
}
export interface AntResultDefinition {
    check?: () => boolean;
    parts: AntResultDefinitionPart[];
    args: string[];
    handler: (...params: any[]) => any;
}
export interface AntConfig {
    sources: AntSourceDefinition[];
    results: AntResultDefinition[];
    additionalConfig?: any[];
}
export interface AntEvent {
    name: string;
    payload: any;
}
export interface AntSourceEvent extends AntEvent {
}
export interface AntResultEvent extends AntEvent {
    toResult: boolean;
}
export declare const fromObservable: (source$: Observable<AntSourceEvent>, config: AntConfig) => Observable<AntResultEvent>;
export declare const fromPromise: (source: Promise<AntSourceEvent[]>, config: AntConfig) => Observable<AntResultEvent>;
