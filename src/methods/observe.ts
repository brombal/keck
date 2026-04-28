import { Observer } from 'keck/core/Observer';
import type { Value } from 'keck/core/RootNode';

import { type DeriveEqualFn, derive } from './derive';
import { focus } from './focus';
import { unwrap } from './unwrap';

type ObserveConfig<TValue, TDerived> = {
  derive: (state: TValue) => TDerived;
  onChange: (derived: TDerived) => void;
  isEqual?: DeriveEqualFn<TDerived>;
};

export function observe<TValue extends object>(value: TValue, cb?: () => void): TValue;

export function observe<TValue extends object, TDerived>(
  value: TValue,
  config: ObserveConfig<TValue, TDerived>,
): TValue;

export function observe<TValue extends object, TDerived>(
  value: TValue,
  cbOrConfig?: (() => void) | ObserveConfig<TValue, TDerived>,
): TValue {
  value = unwrap(value);

  let deriveFn: ((s: TValue) => TDerived) | undefined;
  let isEqual: DeriveEqualFn<TDerived> | undefined;
  let cb: (() => void) | undefined;
  let state!: TValue;

  if (cbOrConfig && typeof cbOrConfig === 'object') {
    let lastDerived: TDerived;
    const rawDeriveFn = cbOrConfig.derive;
    deriveFn = (s) => {
      lastDerived = rawDeriveFn(s);
      return lastDerived;
    };
    isEqual = cbOrConfig.isEqual;
    cb = () => cbOrConfig.onChange(lastDerived);
  } else {
    cb = cbOrConfig;
  }

  const observer = new Observer(value as Value, cb);
  state = observer.rootNode.getObservable(observer, [], value as Value) as TValue;

  if (deriveFn) {
    focus(state);
    derive(() => deriveFn!(state), isEqual);
    focus(state, false);
  }

  return state;
}
