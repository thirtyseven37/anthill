export * from "./types";
import { Observable } from "@reactivex/rxjs";
import { AntSourceEvent, AntConfig, AntResultEvent } from "./types";
export declare const fromObservable: (source$: Observable<AntSourceEvent>, config: AntConfig) => Observable<AntResultEvent>;
export declare const fromPromise: (source: Promise<AntSourceEvent[]>, config: AntConfig) => Observable<AntResultEvent>;
