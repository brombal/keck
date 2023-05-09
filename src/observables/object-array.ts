import {
  ObservableFactory,
  observableFactories,
  getContext,
  Observable,
  unwrap,
} from "../createObserver";

export const objectAndArrayObservableFactory: ObservableFactory<
  Record<string | symbol, unknown>,
  string | symbol
> = {
  makeObservable: (ctx) => {
    return new Proxy(
      // The target of the proxy is not relevant since we always get/set values directly on the context value object.
      // We only use the context object to make debugging easier.
      ctx as any,
      {
        has(_, prop) {
          return Reflect.has(ctx.value, prop);
        },
        get(_, prop) {
          if (prop === getContext) return () => ctx;

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
            if (prop !== "length") ctx.modifyIdentifier(prop);

            return setResult;
          }

          const result = Reflect.set(ctx.value, prop, rawValue, ctx.value);
          ctx.modifyIdentifier(prop);
          return result;
        },
        deleteProperty(_, p): boolean {
          const result = Reflect.deleteProperty(ctx.value, p);
          ctx.modifyIdentifier(p);
          return result;
        },
      }
    ) as Observable;
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

observableFactories.set(Object, objectAndArrayObservableFactory);
observableFactories.set(Array, objectAndArrayObservableFactory);
