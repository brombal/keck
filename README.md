# <img src="logo.svg" alt="Keck" style="display: block; max-width: 600px">

Keck is observable state for React and plain TypeScript. Wrap an object, read the properties you render, then mutate the
object directly. Keck re-renders only the components that read the properties that changed.

```tsx
import { useObserver } from "keck/react";

function Counter() {
  const state = useObserver({ count: 0 });

  return (
    <button type="button" onClick={() => state.count++}>
      Count: {state.count}
    </button>
  );
}
```

No setters. No reducers. No action names. No selectors. Just normal objects with fine-grained subscriptions. The returned proxy has the same TypeScript type as the object you pass in — no wrapper types or casting required.

## Why Keck

- **Direct mutation with React updates**: write `state.user.name = "Ada"` and React updates the components that depend
  on that value.
- **Fine-grained rendering**: reads during render become subscriptions, so unrelated changes do not fan out through the
  tree.
- **Shared state without providers**: several components can observe the same object and each re-renders independently
  for the properties it actually read.
- **Derived values**: compute values from state and re-render only when the computed result changes.
- **TypeScript-first**: observable values keep the exact type of the object you pass in — no wrapper types, no type gymnastics.

## If You're Already Using...

**Valtio** — Valtio requires two mental models: a mutable proxy for writing and an immutable snapshot for reading.
Keck uses a single proxy for both. You read and write through the same object everywhere, and subscription tracking
happens automatically from what you render — no `useSnapshot` call, no separate read/write paths to keep straight.

**Zustand** — Zustand gives you fine-grained control via selectors, but you have to write them. Keck derives
subscriptions from your render output automatically, so components update only for the data they actually rendered
without any manual selector work. There's also no store factory or `set` callback — just a plain object you mutate
directly.

**Jotai or Recoil** — Atom-based libraries work well when state is naturally small and independent, but fitting
relational or nested data into atoms often takes real effort. Keck lets you keep state as plain nested objects with
no atom definitions, no selectors, and no Provider. If your state already looks like a JavaScript object, Keck
fits it without restructuring.

## Installation

```bash
npm install keck
```

**3.44 KB** minified and gzipped (core). The React entry point adds **757 B**. No runtime dependencies — React is a peer dependency.

Requires React 18.2 or newer. Compatible with Strict Mode, Suspense, and `startTransition`.

## A Real Shared Store

Keck works well when several components need the same data but not the same render schedule. Each component calls
`useObserver()` with the same underlying object.

```tsx
// store.ts
export const store = {
  user: {
    id: "user_123",
    name: "Ada Lovelace",
  },
  cart: {
    items: [] as Array<{ id: string; name: string; price: number }>,
  },
  ui: {
    cartOpen: false,
  },
};
```

```tsx
// CartButton.tsx
import { useObserver } from "keck/react";
import { store } from "./store";

export function CartButton() {
  const state = useObserver(store);

  return (
    <button type="button" onClick={() => (state.ui.cartOpen = true)}>
      Cart ({state.cart.items.length})
    </button>
  );
}
```

```tsx
// AddToCartButton.tsx
import { useObserver } from "keck/react";
import { store } from "./store";

export function AddToCartButton(props: {
  product: { id: string; name: string; price: number };
}) {
  const state = useObserver(store);

  return (
    <button type="button" onClick={() => state.cart.items.push(props.product)}>
      Add to cart
    </button>
  );
}
```

`CartButton` re-renders when `cart.items.length` changes. `AddToCartButton` does not re-render when the cart changes
because it does not read cart data during render.

## Derived Values

Use `derive()` when the UI depends on a computed result rather than every source value.

```tsx
import { derive } from "keck";
import { useObserver } from "keck/react";
import { store } from "./store";

export function FreeShippingNotice() {
  const state = useObserver(store);

  const hasFreeShipping = derive(() => {
    return state.cart.items.reduce((sum, item) => sum + item.price, 0) >= 100;
  });

  return hasFreeShipping ? (
    <p>Free shipping unlocked.</p>
  ) : (
    <p>Spend $100 or more to unlock free shipping.</p>
  );
}
```

Derived values can also take a custom equality function, which is useful for arrays and objects.

```tsx
import { derive, shallowCompare } from "keck";
import { useObserver } from "keck/react";
import { store } from "./store";

export function CartItemList() {
  const state = useObserver(store);

  // Re-render only when the set of IDs actually changes, not on every cart mutation.
  const cartItemIds = derive(
    () => state.cart.items.map((item) => item.id),
    shallowCompare,
  );

  return cartItemIds.map((id) => <CartItem key={id} id={id} />);
}
```

## How It Works

`useObserver(data)` returns a proxy for `data`. When a component renders, Keck tracks the leaf reads — primitives,
`size`, `length`, `has(...)`, and any other value that is not itself an observable object. When you later write through
any Keck proxy for the same underlying object, Keck notifies only the observers whose reads were affected.

```tsx
function ProfileName() {
  const state = useObserver(store);

  return <h2>{state.user.name}</h2>;
}
```

This component re-renders when `state.user.name` changes. It does not re-render when cart items, UI flags, or other user
fields change.

For effects that need to respond to any nested change under an object, use `deep()`.

```tsx
import { deep, unwrap } from "keck";
import { useEffect } from "react";

function AutosaveProfile() {
  const state = useObserver(store);

  useEffect(() => {
    void fetch("/api/profile", {
      method: "POST",
      body: JSON.stringify(unwrap(state.user)),
    });
  }, [deep(state.user)]);

  return null;
}
```

## Documentation

- [Getting started](docs/getting-started.md): install, first component, shared state, and common patterns.
- [React guide](docs/react.md): `useObserver`, callback overloads, dependencies, refs, and React gotchas.
- [Vanilla TypeScript guide](docs/vanilla.md): `observe`, focused observers, and shared module-level state outside React.
- [Custom classes](docs/classes.md): registering classes, methods, getters and setters, async writes.
- [Recipes](docs/recipes.md): user accounts, shopping carts, persistence, API boundaries, and form resets.
- [Mental model](docs/mental-model.md): the rules that make Keck predictable.
- [API reference](docs/api.md): all public exports.

## API at a Glance

```ts
import { atomic, deep, derive, observe, ref, unwrap } from "keck";

import { reactRef, useObserver } from "keck/react";
```

| API | Use it for |
| --- | --- |
| `useObserver(data, deps?)` | React state that re-renders from properties read during render. |
| `useObserver(data, cb, deps?)` | React state plus a synchronous callback on any change. |
| `useObserver(data, { derive, onChange, isEqual? }, deps?)` | React state plus a synchronous callback when a derived result changes. |
| `observe(data, cb?)` | Observable state outside React. |
| `observe(data, { derive, onChange, isEqual? })` | Observable state outside React with a derived callback. |
| `derive(fn, isEqual?)` | Computed values that notify only when the result changes. |
| `deep(value)` | Subscribe to any nested change under an observable object. |
| `unwrap(value)` | Get the raw object at API and library boundaries. |
| `atomic(fn)` | Batch multiple writes into one notification pass. |

## Reliability

Keck is used in production applications. The test suite covers React rendering behavior, vanilla observers, derived
values, arrays, Maps, Sets, custom classes, refs, and utilities.

```text
Test Suites: 30 passed, 30 total
Tests:       159 passed, 159 total
```

## License

MIT
