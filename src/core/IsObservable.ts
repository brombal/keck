import { getObservableFactory } from "keck/factories/observableFactories";

export function isObservable(value: any, throwEx = false): value is object {
  if (value && typeof value === 'object' && getObservableFactory(value.constructor)) {
    return true;
  }
  if (throwEx) {
    let valueLabel = String(value);
    if (value && (typeof value === 'object' || typeof value === 'function'))
      valueLabel = `of type ${value.constructor.name}`;
    else if (typeof value === 'string') valueLabel = `"${value}"`;
    throw new Error(`Value ${valueLabel} is not observable`);
  }
  return false;
}