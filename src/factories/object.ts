import { type ObservableFactory } from "#keck/factories/observableFactories";
import { atomic } from "#keck/methods/atomic";
import { unwrap } from "#keck/methods/unwrap";

export const objectFactory: ObservableFactory<Record<string | symbol, unknown>> = {
  makeObservable: (ctx) => {
    return new Proxy(
      // The target of the proxy is not really relevant since we always get/set values directly on the context value object.
      // It's important to pass the original value though, because it needs to be an array for certain internal checks (Array.isArray, for example)
      ctx.value,
      {
        has(_, prop) {
          ctx.observeIdentifier(prop);
          return Reflect.has(ctx.value, prop);
        },
        get(_, prop, observable) {
          // if (prop === "toJSON") return () => ctx.value;
          const propValue = Reflect.get(ctx.value, prop, observable);
          if (typeof propValue === "function") {
            return (...args: unknown[]) => {
              // Todo cache function?
              return atomic(propValue as () => unknown, args, observable);
            };
          }
          return ctx.observeIdentifier(prop, propValue);
        },
        set(_, prop, newValue, observer) {
          const rawValue = unwrap(newValue);
          const oldValue = Reflect.get(ctx.value, prop, ctx.value);
          if (oldValue === rawValue) return true;

          if (Array.isArray(ctx.value)) {
            const arrayLength = ctx.value.length;

            const setResult = Reflect.set(ctx.value, prop, rawValue, ctx.value);

            atomic(() => {
              if (arrayLength !== ctx.value.length) ctx.modifyIdentifier("length");
              if (prop !== "length") ctx.modifyIdentifier(prop);
            });

            return setResult;
          }

          const result = Reflect.set(ctx.value, prop, rawValue, observer);
          ctx.modifyIdentifier(prop);
          return result;
        },
        ownKeys(_) {
          const keys = Reflect.ownKeys(ctx.value);
          for (const key of keys) {
            ctx.observeIdentifier(key);
          }
          return keys;
        },
        deleteProperty(_, prop): boolean {
          const res = Reflect.deleteProperty(ctx.value, prop);
          if (res) ctx.modifyIdentifier(prop);
          return res;
        },
      },
    );
  },
};
