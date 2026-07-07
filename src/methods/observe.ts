import { Observer, type ObserverCallbackContext } from 'keck/core/Observer';
import type { Value } from 'keck/core/RootNode';
import { registerObservableFinalizer } from 'keck/util/garbageCollection';
import { type DeriveEqualFn, derive } from './derive';
import { focus } from './focus';
import { unwrap } from './unwrap';

export type { ObserverCallbackContext };

type NamedConfig = {
  name: string;
};

type DeriveConfig<TValue, TDerived> = {
  name?: string;
  derive: (state: TValue) => TDerived;
  onChange: (derived: TDerived, context: ObserverCallbackContext) => void;
  isEqual?: DeriveEqualFn<TDerived>;
};

type FocusableConfig = {
  name?: string;
  focusable: true;
  onChange: (context: ObserverCallbackContext) => void;
};

export function observe<TValue extends object>(
  value: TValue,
  cb?: (context: ObserverCallbackContext) => void,
): TValue;

// The config overloads are ordered most-specific first. NamedConfig must come LAST: it matches
// any config containing `name`, and because a derive function without parameter annotations is
// context-sensitive (deferred during overload resolution), a DeriveConfig with `name` would
// otherwise resolve against NamedConfig and leave the derive parameter implicitly `any`.
export function observe<TValue extends object, TDerived>(
  value: TValue,
  config: DeriveConfig<TValue, TDerived>,
): TValue;

export function observe<TValue extends object>(value: TValue, config: FocusableConfig): TValue;

export function observe<TValue extends object>(value: TValue, config: NamedConfig): TValue;

export function observe<TValue extends object, TDerived>(
  value: TValue,
  cbOrConfig?:
    | ((context: ObserverCallbackContext) => void)
    | NamedConfig
    | FocusableConfig
    | DeriveConfig<TValue, TDerived>,
): TValue {
  value = unwrap(value);

  let deriveFn: ((s: TValue) => TDerived) | undefined;
  let isEqual: DeriveEqualFn<TDerived> | undefined;
  let cb: ((context: ObserverCallbackContext) => void) | undefined;
  let isFocusable = false;
  let name: string | undefined;
  let state!: TValue;

  if (cbOrConfig && typeof cbOrConfig === 'object') {
    if ('derive' in cbOrConfig) {
      isFocusable = true;
      name = cbOrConfig.name;
      let lastDerived: TDerived;
      const rawDeriveFn = cbOrConfig.derive;
      deriveFn = (s) => {
        lastDerived = rawDeriveFn(s);
        return lastDerived;
      };
      isEqual = cbOrConfig.isEqual;
      cb = (ctx) => cbOrConfig.onChange(lastDerived, ctx);
    } else if ('focusable' in cbOrConfig) {
      isFocusable = true;
      name = cbOrConfig.name;
      cb = cbOrConfig.onChange;
    } else {
      // NamedConfig: name only, no callback
      name = cbOrConfig.name;
    }
  } else {
    cb = cbOrConfig;
  }

  const observer = new Observer(value as Value, { name, callback: cb, focusable: isFocusable });
  state = observer.rootNode.getObservable(observer, [], value as Value) as TValue;

  if (deriveFn) {
    const session = focus(state);
    derive(() => deriveFn!(state), isEqual);
    session.commit();
  }

  if (cb) {
    observer.rootNode.callbackObservers.add(observer);
  } else {
    registerObservableFinalizer(state);
  }

  return state;
}
