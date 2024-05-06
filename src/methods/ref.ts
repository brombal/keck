import { isObservable } from "#keck/core/Observer";

const refMap = new WeakSet<object>();

export function ref<T>(value: T): T {
  if (isObservable(value)) refMap.add(value);
  return value;
}

export function isRef(value: any): boolean {
  return refMap.has(value);
}
