import type { ObservableFactory } from 'keck/factories/observableFactories';
import { atomic, atomicAllowPromise } from 'keck/methods/atomic';
import { unwrap } from 'keck/methods/unwrap';

const keyLength = Symbol('keyLength');

export const objectFactory: ObservableFactory<Record<string | symbol, unknown>> = {
  makeObservable: (ctx) => {
    return new Proxy(
      // The target of the proxy is not really relevant since we always get/set values directly on the context value object.
      // It's important to pass the original value though, because it needs to be an array for certain internal checks (Array.isArray, for example)
      ctx.value,
      {
        get(_, prop, observable) {
          // if (prop === "toJSON") return () => ctx.value;
          const propValue = Reflect.get(ctx.value, prop, observable);
          // `constructor` is returned as-is (matching ObservableSet/ObservableMap, which pin
          // their constructor to the native class). Wrapping it like other function properties
          // would return a non-constructable arrow function and break identity checks — e.g.
          // lodash's cloneDeep calls `new array.constructor()` on arrays, and
          // `observable.constructor === Array` should hold.
          if (prop === 'constructor') return propValue;
          if (typeof propValue === 'function') {
            return (...args: unknown[]) => {
              // Todo cache function?
              return atomicAllowPromise(
                propValue as (...args: unknown[]) => unknown,
                args,
                observable,
              );
            };
          }
          // Unwrap before wrapping: plain data properties always hold raw values (the set trap
          // unwraps on write), but a getter runs with the proxy as its receiver and may return an
          // already-observable value -- wrapping that again would produce a proxy-over-proxy,
          // which unwrap() only peels one layer of.
          return ctx.observeIdentifier(prop, unwrap(propValue));
        },
        set(_, prop, newValue, observer) {
          const rawValue = unwrap(newValue);
          const oldValue = Reflect.get(ctx.value, prop, ctx.value);
          if (oldValue === rawValue) return true;

          const oldHas = Reflect.has(ctx.value, prop);

          if (Array.isArray(ctx.value)) {
            const arrayLength = ctx.value.length;

            const setResult = Reflect.set(ctx.value, prop, rawValue, ctx.value);

            atomic(() => {
              if (arrayLength !== ctx.value.length) ctx.modifyIdentifier('length');
              if (prop !== 'length') ctx.modifyIdentifier(prop);
            });

            return setResult;
          }

          // Check if property is a setter or a regular property
          if (isSetter(ctx.value, prop)) {
            return atomic(() => {
              const result = Reflect.set(ctx.value, prop, rawValue, observer);
              ctx.modifyIdentifier(prop);
              return result;
            });
          }

          const result = Reflect.set(ctx.value, prop, rawValue, observer);
          atomic(() => {
            ctx.modifyIdentifier(prop);
            if (!oldHas) ctx.modifyIdentifier(keyLength);
          });
          return result;
        },
        ownKeys(_) {
          const keys = Reflect.ownKeys(ctx.value);
          ctx.observeIdentifier(keyLength);
          return keys;
        },
        deleteProperty(_, prop): boolean {
          const res = Reflect.deleteProperty(ctx.value, prop);
          if (res) {
            atomic(() => {
              ctx.modifyIdentifier(prop);
              ctx.modifyIdentifier(keyLength);
            });
          }
          return res;
        },
      },
    );
  },
};

function findPropertyDescriptor(obj: any, prop: string | symbol) {
  while (obj) {
    const desc = Reflect.getOwnPropertyDescriptor(obj, prop);
    if (desc) return desc;
    obj = Object.getPrototypeOf(obj);
  }
  return undefined;
}

function isSetter(obj: any, prop: string | symbol) {
  return !!findPropertyDescriptor(obj, prop)?.set;
}
