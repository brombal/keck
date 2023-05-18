import { observableFactories } from "./observe";

export const _ref = Symbol('ref');

export interface Ref {
  [_ref]: true;
  value: object;
}

export function ref<T extends object>(value: T): Ref | T {
  const factory = observableFactories.get(value.constructor as any);
  if (!factory) return value;
  return {
    [_ref]: true,
    value,
  };
}

export function isRef(value: any): value is Ref {
  return value?.[_ref];
}
