import { ObservableFactory, observableFactories, unwrap } from "../observe";

export const objectAndArrayObservableFactory: ObservableFactory<
  Record<string | symbol, unknown>,
  string | symbol
> = {
  makeObservable: (ctx) => {
    return new Proxy(
      // The target of the proxy is not relevant since we always get/set values directly on the context value object.
      // We only use the context to make debugging easier.
      ctx,
      {
        ownKeys() {
          ctx.dataNode.parent &&
            ctx.observer.contextForNode
              .get(ctx.dataNode.parent)
              ?.observeIdentifier(ctx.dataNode.identifier);
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
            if (prop !== "length") ctx.modifyIdentifier(prop);

            return setResult;
          }

          const result = Reflect.set(ctx.value, prop, rawValue, ctx.value);
          ctx.modifyIdentifier(prop);
          return result;
        },
        deleteProperty(_, prop): boolean {
          if (Reflect.has(ctx.value, prop)) ctx.modifyIdentifier(prop);
          return Reflect.deleteProperty(ctx.value, prop);
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

observableFactories.set(Object, objectAndArrayObservableFactory);
observableFactories.set(Array, objectAndArrayObservableFactory);
