import { ObservableContext } from "#keck/core/ObservableContext";
import { type Observable } from "#keck/core/RootNode";

export function focus(observable: any, enableFocus = true) {
  ObservableContext.getForObservable(observable as Observable).observer.focus(enableFocus);
}
