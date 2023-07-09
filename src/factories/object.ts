import { unwrap } from "../createObserver";
import { observableFactories, ObservableFactory } from "../observableFactories";

export const objectFactory: ObservableFactory<Record<string | symbol, unknown>, string | symbol> = {
  makeObservable: (ctx) => {
    return new Proxy(
      // The target of the proxy is not really relevant since we always get/set values directly on the context value object.
      // It's important to pass the original value though, because it needs to be an array for certain internal checks (Array.isArray, for example)
      ctx.value,
      {
        getPrototypeOf() {
          return Reflect.getPrototypeOf(ctx.value);
        },
        getOwnPropertyDescriptor(target, p) {
          ctx.observeIdentifier(p);
          return Reflect.getOwnPropertyDescriptor(ctx.value, p);
        },
        ownKeys() {
          return Reflect.ownKeys(ctx.value);
        },
        has(_, prop) {
          ctx.observeIdentifier(prop);
          return Reflect.has(ctx.value, prop);
        },
        get(_, prop) {
          if (prop === "toJSON") return () => ctx.value;
          const value = Reflect.get(ctx.value, prop, ctx.value);
          return ctx.observeIdentifier(prop, value);
        },
        set(_, prop, value) {
          const rawValue = unwrap(value);
          const oldValue = Reflect.get(ctx.value, prop, ctx.value);
          if (oldValue === rawValue) return true;

          if (Array.isArray(ctx.value)) {
            const arrayLength = ctx.value.length;

            const setResult = Reflect.set(ctx.value, prop, rawValue, ctx.value);

            if (arrayLength !== ctx.value.length) ctx.modifyIdentifier("length");
            if (prop !== "length") ctx.modifyIdentifier(prop, rawValue);

            return setResult;
          }

          const result = Reflect.set(ctx.value, prop, rawValue, ctx.value);
          ctx.modifyIdentifier(prop, rawValue);
          return result;
        },
        deleteProperty(_, prop): boolean {
          const res = Reflect.deleteProperty(ctx.value, prop);
          if (res) ctx.modifyIdentifier(prop);
          return res;
        },
      }
    );
  },
  handleChange(value, identifier, newValue) {
    value[identifier] = newValue;
  },
  createClone(value: any) {
    if (Array.isArray(value)) return [...value];
    const clone = { ...value };
    Object.setPrototypeOf(clone, Object.getPrototypeOf(value));
    return clone;
  },
};

observableFactories.set(Object, objectFactory);
observableFactories.set(Array, objectFactory);
