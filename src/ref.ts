import { observableFactories } from "./createObserver";

const _ref = Symbol('ref');

export function ref<T>(value: T): T {
  const factory = value && observableFactories.get(value.constructor as any);
  if (!factory) return value;
  (value as any)[_ref] = true;
  return value;
}

export function isRef<T>(value: T): boolean {
  return !!(value as any)?.[_ref];
}
