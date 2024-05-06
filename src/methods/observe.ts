import { Observer } from "#keck/core/Observer";
import { type Value } from "#keck/core/RootNode";

import { DeriveEqualFn, derive } from "./derive";
import { focus } from "./focus";
import { unwrap } from "./unwrap";

type ObserverDeriveFn<TValue, TDerived> = (state: TValue) => TDerived;

export function observe<TValue extends object, TDerive>(
  value: TValue,
  cb?: () => void,
  deriveFn?: ObserverDeriveFn<TValue, TDerive>,
  isEqual?: DeriveEqualFn<TDerive>,
): TValue {
  value = unwrap(value);
  const observer = new Observer(value as Value, cb);
  const state = observer.rootNode.getObservable(observer, [], value as Value) as TValue;
  if (deriveFn) {
    focus(state);
    derive(() => deriveFn!(state), isEqual);
    focus(state, false);
  }
  return state;
}
