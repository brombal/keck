import { ObservableContext } from "#keck/core/ObservableContext";
import { type Observable } from "#keck/core/RootNode";

export function reset(observable: any, focus = false) {
  ObservableContext.getForObservable(observable as Observable).observer.reset(focus);
}
