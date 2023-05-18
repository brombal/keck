import { observableFactories } from "./observe";

const _ref = Symbol('ref');

export function ref<T extends object>(value: T): T {
  const factory = observableFactories.get(value.constructor as any);
  if (!factory) return value;
  (value as any)[_ref] = true;
  return value;
}

export function isRef<T>(value: T): boolean {
  return !!(value as any)?.[_ref];
}
