# React Guide

The React entry point exports `useObserver` and `reactRef`.

```tsx
import { reactRef, useObserver } from "keck/react";
```

## `useObserver(data, deps?)`

`useObserver()` returns an observable proxy for `data`. During render, Keck tracks the properties you read. Later writes
to those properties re-render that component.

```tsx
import { useObserver } from "keck/react";

export function QuantityPicker() {
  const state = useObserver({ quantity: 1 });

  return (
    <div>
      <button type="button" onClick={() => state.quantity--}>
        -
      </button>
      <span>{state.quantity}</span>
      <button type="button" onClick={() => state.quantity++}>
        +
      </button>
    </div>
  );
}
```

The inline object is an initializer. Changing the literal on a later render does not reset the state. Pass dependencies
when you want to recreate the observable.

```tsx
function ProductForm(props: { productId: string }) {
  const form = useObserver(
    {
      productId: props.productId,
      quantity: 1,
      notes: "",
    },
    [props.productId],
  );

  return <input value={form.notes} onChange={(event) => (form.notes = event.target.value)} />;
}
```

## Shared Objects

For app-level state, define a stable object and call `useObserver()` in each component that needs it.

```ts
// store.ts
export const store = {
  cart: {
    items: [] as Array<{ id: string; name: string; price: number }>,
  },
  ui: {
    cartOpen: false,
  },
};
```

```tsx
import { useObserver } from "keck/react";
import { store } from "./store";

export function CartDrawer() {
  const state = useObserver(store);

  if (!state.ui.cartOpen) return null;

  return (
    <aside>
      {state.cart.items.map((item) => (
        <p key={item.id}>
          {item.name}: ${item.price}
        </p>
      ))}
      <button type="button" onClick={() => (state.ui.cartOpen = false)}>
        Close
      </button>
    </aside>
  );
}
```

When the drawer is closed, `cart.items` is not read during render, so cart changes do not re-render this component.

## `useObserver(data, cb, deps?)` - Synchronous Mutation Callback

`useObserver(data, cb, deps?)` gives you two independent behaviors:

- The returned state can be read during render, just like `useObserver(data)`, and those reads control component
  re-renders.
- The callback fires synchronously for any real change to the underlying observed data while the component is mounted,
  even if the changed property was not read during render.

```tsx
import { useObserver } from "keck/react";

const settingsStore = {
  theme: "system",
  compactMode: false,
};

export function SettingsPanel() {
  const settings = useObserver(
    settingsStore,
    () => {
      localStorage.setItem("settings", JSON.stringify(settingsStore));
    },
    [],
  );

  return (
    <label>
      <input
        type="checkbox"
        checked={settings.compactMode}
        onChange={(event) => (settings.compactMode = event.target.checked)}
      />
      Compact mode
    </label>
  );
}
```

The callback runs immediately after the write that triggered it. Use this for synchronous side effects such as
persistence, invariant checks, imperative bridges, or ordered logging. Use React effects when post-commit timing is
better.

You can ignore the returned state if the component only exists to keep the callback active while mounted.

## `useObserver(data, { derive, onChange, isEqual? }, deps?)` - Synchronous Derived Callback

`useObserver(data, { derive, onChange, isEqual? }, deps?)` also keeps render subscriptions and callback subscriptions
separate. The derive function establishes its own observations, and `onChange` fires only when the derived result
changes. It does not depend on which properties this component renders.

```tsx
import { useObserver } from "keck/react";

const checkoutStore = {
  cart: {
    items: [] as Array<{ id: string; price: number }>,
  },
};

export function CartAnalytics() {
  useObserver(
    checkoutStore,
    {
      derive: (state) => state.cart.items.length,
      onChange: (count) => {
        console.log("Cart item count changed", count);
      },
    },
    [],
  );

  return null;
}
```

This overload is useful when a component needs to attach a lifecycle-bound listener to a computed condition, such as
cart item count, authentication status, or whether a form has unsaved changes.

## Class Instances as State

Keck observes plain objects, arrays, `Map`, and `Set` natively. To use a custom class as observable state — for example a domain model with methods, getters, or computed properties — register it with `registerObservableClass()`. Methods become atomic, getters become reactive, and setters notify observers in one batch. See the [Custom Classes guide](classes.md) for the full behavior.

## Refs inside Observable State

React refs write to `.current`. Use `reactRef()` when a ref is stored inside observable state, so the DOM element itself
does not become observable.

```tsx
import { reactRef, useObserver } from "keck/react";

export function SearchBox() {
  const state = useObserver({
    input: reactRef<HTMLInputElement>(),
  });

  return (
    <>
      <input ref={state.input} />
      <button type="button" onClick={() => state.input.current?.focus()}>
        Focus
      </button>
    </>
  );
}
```

## React 18 Compatibility

Keck requires React 18.2 or newer and is tested against React 18's concurrent features.

**Strict Mode** — In development, React 18 Strict Mode double-invokes component function bodies
and simulates an unmount/remount cycle on initial mount to surface side effects. Keck handles this
correctly: observations from the discarded first invocation are cleared before the second
invocation tracks reads, and the simulated cleanup does not destroy the committed observations.
The function body runs twice per React render in Strict Mode, which is expected.

**Suspense** — When a component suspends mid-render (throws a Promise), Keck detects the abandoned
render and discards any property reads made before the throw. When the component re-renders after
the promise resolves, it starts fresh with only the reads from the successful render.

**`startTransition`** — Subscriptions reflect only the committed render's reads after a transition
completes. Intermediate renders within a transition do not leave stale observations.

## Notes on `derive()`

Call `derive()` during render, not inside `useEffect`, event handlers, or other callbacks. Reads are only tracked as
subscriptions while a component is rendering, so a `derive()` call elsewhere computes its result but does not
subscribe the component to future changes.

Unlike hooks, `derive()` does not depend on call order and can be called conditionally.

## Common Gotchas

- Subscriptions only come from reads during render. Reads inside `useEffect`, event handlers, callbacks, timers, or any
  other code that runs after render do not subscribe the component to anything. The same applies to destructured or
  aliased values: `const user = state.user` captures the proxy at render time, but reading `user.name` later in a
  callback does not retroactively subscribe the component to `user.name`. If you need a value to drive re-renders,
  read it during render.
- Do not pass a proxy created inside one component into another component as the shared store. It is fine to pass an
  exported Keck proxy to `useObserver()`; each component still gets its own observer.
- Do not mutate the raw object when you expect React to update. Writes must go through a Keck proxy.
- Reading an object reference such as `state.user` does not subscribe to every nested field. Read the fields you render,
  use `derive()`, or use `deep()` when any nested change should re-run an effect or notify a focused observer.
- `unwrap()` is best at API boundaries. Rendering unwrapped values bypasses subscriptions.
