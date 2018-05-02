import { AntConfig, AntResultEvent, AntSourceEvent } from "./types";
import { Observable } from "@reactivex/rxjs";
export declare const fromObservable: (source$: Observable<AntSourceEvent>, config: AntConfig) => Observable<AntResultEvent>;
export declare const fromPromise: (source: Promise<AntSourceEvent[]>, config: AntConfig) => Observable<AntResultEvent>;
