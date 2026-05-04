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

## What Keck Does

- **Mutate state directly** — assign to a property and components update: `state.count++`, `state.user.name = "Ada"`,
  `state.cart.items.push(item)`. If you've been told that mutating state in React is dangerous, that instinct comes
  from a real place — but the danger is specific to bypassing React's change detection. Keck's proxy closes that gap,
  so writes are always tracked. For updates that need logic or guard rails, regular setter methods and class methods
  work as expected. [More on this →](docs/mutability.md)
- **Fine-grained re-renders, automatically** — Keck records what each component reads during render and re-renders only
  when those specific values change. A component that reads `state.user.name` only re-renders when that value changes;
  everything else in your store is irrelevant to it.
- **Your state is a real, mutable object** — one reference, always current; stale copies are not a concern. Keck works
  with plain JavaScript objects or instances of your own classes — it adds nothing to the object itself and requires no
  special interfaces or base classes. Your TypeScript types come through unchanged. A lightweight proxy wraps the object
  to track subscriptions, and removing it when you need the raw data is a one-call operation.
- **Shared state, each component independent** — multiple components can observe the same object, each calling
  `useObserver(store)` and re-rendering only for the values it actually reads. No store factory or subscription
  boilerplate required.
- **Tiny** — 4.78 KB gzipped core, 0.99 KB for React. No runtime dependencies.

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

`useObserver(data)` returns a proxy for `data`. During render, Keck records which leaf values — primitives, `length`,
`size`, collection membership — the component actually reads. Those reads become subscriptions. When you later mutate
through any proxy for the same underlying object, only the components that read the affected values are re-rendered.

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

For a full explanation of the rules, see the [Mental Model](docs/mental-model.md).

## Coming from Another Library?

**Valtio** — Keck uses one proxy for both reading and writing. Valtio separates these: you write through a mutable
proxy and read through an immutable snapshot, which means keeping two mental models in sync and remembering to call
`useSnapshot` in every component. With Keck you read and write through the same object everywhere, and subscription
tracking happens automatically from what you render.

**Zustand** — Keck derives subscriptions from your render output automatically, so components update only for the data
they actually rendered. Zustand gives you fine-grained control via selectors — functions you write that pull a specific
slice of state so a component doesn't over-subscribe — but you have to write them. Keck does that tracking for you.
There's also no store factory or `set` callback; just a plain object you mutate directly.

**Jotai or Recoil** — Keck lets you keep state as plain nested objects, no restructuring required. Atom-based libraries
break state into individual atoms — small, independent pieces — which works well for naturally isolated state but can
require real effort when data is relational or nested. Keck fits nested data natively, with no atom definitions, no
selectors, and no Provider.

## Installation

```bash
npm install keck
```

Requires React 18.2 or newer. Compatible with Strict Mode, Suspense, and `startTransition`.

## Documentation

- [Getting started](docs/getting-started.md): install, first component, shared state, and common patterns.
- [React guide](docs/react.md): `useObserver`, callback overloads, dependencies, refs, and React gotchas.
- [Vanilla TypeScript guide](docs/vanilla.md): `observe`, focused observers, and shared module-level state outside React.
- [Custom classes](docs/classes.md): registering classes, methods, getters and setters, async writes.
- [Recipes](docs/recipes.md): user accounts, shopping carts, persistence, API boundaries, and form resets.
- [Mental model](docs/mental-model.md): the rules that make Keck predictable.
- [Mutability in Keck](docs/mutability.md): why mutation is safe here, and how it compares to immutable patterns.
- [Redux DevTools](docs/devtools.md): connecting to the DevTools extension, named actions, and time-travel.
- [API reference](docs/api.md): all public exports.

## API at a Glance

```ts
import { atomic, configure, connectDevTools, deep, derive, observe, ref, unobserve, unwrap } from "keck";

import { reactRef, useObserver } from "keck/react";
```

| API | Use it for |
| --- | --- |
| `useObserver(data, deps?)` | React state that re-renders from properties read during render. |
| `useObserver(data, cb, deps?)` | React state plus a synchronous callback on any change. |
| `useObserver(data, { derive, onChange, isEqual? }, deps?)` | React state plus a synchronous callback when a derived result changes. |
| `observe(data, cb?)` | Observable state outside React. |
| `observe(data, { derive, onChange, isEqual? })` | Observable state outside React with a derived callback. |
| `unobserve(state)` | Release a callback-based observer created with `observe`. |
| `derive(fn, isEqual?)` | Computed values that notify only when the result changes. |
| `deep(value)` | Subscribe to any nested change under an observable object. |
| `unwrap(value)` | Get the raw object at API and library boundaries. |
| `atomic(fn)` | Batch multiple writes into one notification pass. |
| `atomic(name, fn)` | Batch with a named action label for DevTools. |
| `connectDevTools(store, options?)` | Connect a store to the Redux DevTools extension. |
| `configure({ onError? })` | Set a global error handler for observer and derive errors. |
| `resetConfiguration()` | Reset global configuration. |
| `fromSnapshot(obs, snap)` | Rehydrate observable state from a plain-object snapshot. |

## SSR / Server-side compatibility

Keck's core (`keck`) has zero browser-specific globals and works in any JS environment — Node.js, edge
runtimes (Cloudflare Workers, Deno Deploy), and Deno. You can safely import and use `observe`, `atomic`,
`derive`, and all other core APIs during server-side rendering.

**`keck/react`** uses React hooks (`useSyncExternalStore`, `useInsertionEffect`, etc.). These are safe for
SSR because React's server renderer never calls effects — subscriptions only attach in the browser.

**`connectDevTools`** connects to the Redux DevTools browser extension. Calling it on the server is safe
(it returns a no-op), but it will never connect. Import it conditionally or only in browser-only code if
you want to avoid loading it on the server altogether.

**Garbage collection** (`initGarbageCollectionObservation`) uses `FinalizationRegistry` and `WeakRef`,
which are available in Node.js 14+ and all modern edge runtimes.

## Reliability

Keck is used in production applications. The test suite covers React rendering behavior, vanilla observers, derived
values, arrays, Maps, Sets, custom classes, refs, and utilities.

```text
Test Suites: 40 passed, 40 total
Tests:       239 passed, 239 total
```

## License

MIT
