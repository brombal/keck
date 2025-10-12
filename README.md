# <img src="logo.svg" alt="Keck" style="display: block; max-width: 600px">

<br>

# Keck ✨🔭 Simple observable state for React

Keck is a lightweight, proxy-based React state management library. It provides fine-grained
reactivity with zero boilerplate—just modify your state, and components will re-render **only if they rendered
the modified properties.**

```tsx
import { useObserver } from 'keck/react';

function Counter() {
  const state = useObserver({ count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}
```

That's it! No `setState`, no reducers, no actions. Just modify your state object, and your component re-renders.

## Features

- ✨ **Zero boilerplate** – No special methods, just modify your state naturally
- ⚡ **High performance** – The fine-grained reactivity results in far fewer total re-renders.
- 🔗 **Shared state** – Share state across components easily without triggering full tree re-renders
- 🧮 **Derived values** – Compute values that only trigger re-renders when their result changes
- 🔍 **Deep observation** – Observe changes to arbitrarily deep objects and arrays
- 📘 **TypeScript support** – Full type safety
- 🪶 **Tiny size** – ~3.2kB minified + gzipped
- 🎯 **No dependencies** – Works with React 18.2+
- ✅ **Well-tested** – 100% unit test coverage

## Installation

```bash
npm install keck
```

## Observing state with `useObserver()`

Simply pass your state object to `useObserver()`. The value returned by `useObserver()` is an **observable wrapper**
around the underlying state object that you can read and modify just like the original object.

```tsx
import { useObserver } from 'keck/react';

function Counter() {
  const state = useObserver({ count: 0 });

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}
```

Behind the scenes, Keck tracks which properties are read during the render. When you modify properties, Keck will only
re-render components if they accessed those properties. Properties accessed outside of rendering (e.g. in effects, event
handlers, etc.) won't cause your components to re-render when they change.

If you conditionally render a section of your component,
properties accessed in that section are only tracked if they are actually rendered. If the section is hidden,
changes to those properties will no longer trigger re-renders.

```tsx
import { useObserver } from "keck/react";

function Counter() {
  const state = useObserver({ count: 0, displayCounter: true });

  return (
    <div>
      {state.displayCounter && (
        <p>Count: {state.count}</p>
      )}

      <label>
        <input
          type="checkbox"
          checked={state.displayCounter}
          onChange={e => state.displayCounter = e.target.checked}
        />
        Show counter
      </label>

      <button onClick={() => state.count++}>Increment</button>
    </div>
  );
}
```

In this example, `state.count` isn't accessed when the checkbox is unchecked, so clicking the **Increment** button
updates the count but doesn't trigger a re-render. When you enable the checkbox, the component re-renders and now tracks
`state.count`. This is a powerful performance improvement, preventing unnecessary re-renders by automatically observing
properties that are actually rendered.

### Shared State

Keck's true power shines with shared state across multiple components. Simply pass the same object to `useObserver()` in
different components, and each component will only re-render when properties it accesses change.

**Let's define an example state object:**

```tsx
// store.ts
export const store = {
  cart: {
    items: [] as Array<{
      id: number;
      name: string;
      price: number
    }>
  },
  user: {
    name: "",
    email: ""
  },
  ui: {
    cartOpen: false
  }
};
```

For these examples, we use a simple module-level variable. In a real app, you might use React context to avoid global
state, or keep the module-level approach for truly global data like auth state or app configuration. The key is that
every component that calls `useObserver(store)` with the same object will share that object's state, reacting to changes
made anywhere in the app.

#### Fine-Grained Reactivity

Different components observing the same state will only re-render when the specific properties they access change:

- `CartButton` only re-renders when the length of `cart.items` changes:

```tsx
// CartButton.tsx
import { useObserver } from 'keck/react';
import { store } from './store';

function CartButton() {
  const state = useObserver(store);

  return (
    <button onClick={() => state.ui.cartOpen = true}>
      Cart ({state.cart.items.length} items)
    </button>
  );
}
```

- `CartDrawer` re-renders when `cart.items` changes, but only if the drawer is open (nothing renders when `ui.cartOpen`
  is false, so changes to `cart.items` don't cause re-renders):

```tsx
// CartDrawer.tsx
import { useObserver } from "keck/react";
import { store } from "./store";

function CartDrawer() {
  const state = useObserver(store);

  // Don't render anything if the cart is closed
  if (!state.ui.cartOpen) return null;

  return (
    <div className="drawer">
      <h2>Your Cart</h2>

      <ul>
        {state.cart.items.map(item => (
          <li key={item.id}>
            {item.name} - ${item.price}
          </li>
        ))}
      </ul>

      <button onClick={() => state.ui.cartOpen = false}>Close</button>
    </div>
  );
}
```

- `AddToCartButton` only adds items to the cart. This component will never re-render because it doesn't access any state
  properties during render:

```tsx
// AddToCartButton.tsx
import { useObserver } from 'keck/react';
import { store } from './store';

function AddToCartButton({ product }) {
  const state = useObserver(store);

  const addItem = () => {
    state.cart.items.push(product);
  };

  return <button onClick={addItem}>Add to Cart</button>;
}
```

## Derived Values with `derive()`

Sometimes you compute values from state, but you only care when the result changes, not when the source data changes.
For example, you might render "Free Shipping" if the cart total is over $1000, but not render the exact amount.

Use `derive()` to compute values from your state object, and Keck will only trigger re-renders when the computed value
changes.

```tsx
// ShippingStatus.tsx
import { useObserver } from 'keck/react';
import { derive } from 'keck';
import { store } from './store';

function ShippingStatus() {
  const state = useObserver(store);

  // Only re-renders when eligibility changes (not when total changes)
  const freeShipping = derive(() => state.cart.total >= 1000);

  return (
    <div>
      {freeShipping ? '✓ Free shipping!' : 'Add $1000 for free shipping'}
    </div>
  );
}
```

Even though `state.cart.total` is accessed in the derive callback, the component only re-renders when the boolean result
changes (crossing the $1000 threshold), not on every price change.

**Custom equality for arrays/objects:**

By default, `derive()` uses strict equality (`===`) to compare subsequent results, making it useful for primitive
values. If the derived value is an object or array, use a custom equality function to determine if the component should
re-render. Keck provides a `shallowCompare` utility for basic shallow object or array comparison,
but you can also write your own.

```tsx
// ProductComparison.tsx
import { useObserver } from "keck/react";
import { derive, shallowCompare } from "keck";
import { store } from "./store";

function ProductComparison() {
  const state = useObserver(store);

  // Use shallowCompare for simple array equality
  const productIds = derive(
    () => state.cart.items.map(item => item.id),
    shallowCompare
  );

  // Or use a custom function (e.g. when creating an array of objects)
  const selectedProducts = derive(
    () => state.cart.items.filter(item => item.selected),
    (prev, next) => {
      return prev.length === next.length && prev.every((product, i) => next.find(p => p.id === product.id));
    }
  );

  // ...
}
```

## Deep Observation with `deep()`

By default, Keck only tracks properties you access if they have primitive values (strings, numbers, etc), because these
are generally the only kinds of values that can be rendered by React.

But sometimes you want a component to re-render when *any* change occurs within an object—for example, to trigger a
useEffect that saves user profile changes whenever *any* property of `state.user` changes.

**The problem:** Normally, accessing `state.user` alone won't cause a re-render, because Keck only responds to changes
of primitive values that are accessed during a render. Even if it did, an object reference doesn't change when its
properties are modified, so it wouldn't trigger an effect to run.

**The solution:** Calling `deep(state.user)` in a component render tells Keck to track all nested properties for that
object. When any nested property changes, Keck re-renders the component. Additionally, Keck creates a new proxy wrapper
for the modified object, allowing it to be used in dependency arrays to trigger effects.

> **Note:** You _don't_ need `deep()` for rendering—Keck automatically tracks the properties you access, including
> implicit ones like `.length` when you call `.map()`.

```tsx
// UserProfile.tsx
import { useObserver } from "keck/react";
import { deep } from "keck";
import { useEffect } from "react";
import { store } from "./store";

function UserProfile() {
  const state = useObserver(store);

  // This marks `state.user` for deep tracking, triggering re-renders when it is modified.
  deep(state.user);

  useEffect(
    () => {
      console.log("Saving user profile...");
      // Save to localStorage, API, etc.
    },
    // The proxy wrapper for `state.user` will be recreated whenever any nested property is modified. 
    // This new proxy reference triggers the effect, even though the underlying object stays the same.
    [state.user]
  );

  return (
    <div>
      <input
        value={state.user.name}
        onChange={e => state.user.name = e.target.value}
      />
      <input
        value={state.user.email}
        onChange={e => state.user.email = e.target.value}
      />
    </div>
  );
}
```

> Note that you can also use `[deep(state.user)]` directly in the dependency array, because `deep()` simply returns what
> is passed to it. This example used a separate call to `deep()` for clarity.

## Removing proxy wrappers with `unwrap()`

Sometimes you need the raw underlying value of your state object (or part of it) instead of the Keck proxy. For example,
it's best to avoid passing proxy wrappers to external libraries or API calls.

**`unwrap(state)`** returns the raw underlying value of a proxy. You can pass the root state object or any nested
object or array. Accessing properties of the unwrapped value will of course not create any observations, so be careful
not to render the unwrapped values, or you may miss updates.

```tsx
import { unwrap } from 'keck';

const logCart = (state) => {
  const rawCart = unwrap(state.cart);
  console.log(JSON.stringify(rawCart));
};
```

## API Reference

### `useObserver<T>(data: T, deps?: unknown[]): T`

Creates an **observable** state object that tracks property access and triggers re-renders when those properties change.

- **`data`**: The state object to observe
- **`deps`** (optional): Dependency array for refreshing the state object when dependencies change

**Returns:** An observable proxy wrapper around the original object

The returned value is a proxy wrapper around the original object that tracks properties that are accessed during
rendering. Any subsequent updates to those properties will trigger a re-render of the component. Properties accessed
outside of the render (during effects, event callbacks, etc.) are not tracked.

The returned value and its nested object properties (e.g. `state.cart.items[0]`, etc) are light-weight proxy wrappers
that behave just like the original objects. The underlying objects are persistent between renders, but the proxy
wrappers are recreated whenever any descendent property changes. This allows you to use observables in dependency arrays
to trigger effects when any nested property changes (if they are being observed—see `deep()` below).

Every component using `useObserver()` on the same object will share its state, re-rendering when that object is changed,
anywhere in the application. However, Keck ensures fine-grained reactivity: components will only re-render when
properties they
accesses change. State objects can be shared using React context, props, module-level variables, etc. When sharing
state, be careful not to use observable proxies created by other components. Every component should call `useObserver()`
on the object to create its own proxy.

For local, inline state objects, the value passed to `useObserver()` is memoized on the first render. If you want to
recreate the observable value (for example, to reset the state when some prop changes), pass a dependency array as the
second argument ot `useObserver()`. The observable will be recreated whenever any dependency value changes.

### `derive<T>(fn: () => T, isEqual?: (prev: T, next: T) => boolean): T`

Use `derive()` to compute values from your state object that only trigger re-renders when the result changes.

```tsx
function derive<T>(fn: () => T, isEqual?: (prev: T, next: T) => boolean): T;
```

- **`fn`**: Function that computes the derived value
- **`isEqual`** (optional): Custom equality function. Accepts previous and next values, returns true if equal

**Returns:** The computed value

### `deep<T>(observable: T): T`

Marks an observable for deep tracking. Use in dependency arrays to trigger effects when any nested property changes.

```tsx
useEffect(() => {
  // Runs when any property of user changes
}, [deep(state.user)]);
```

### `unwrap<T>(value: T)`

Returns the raw underlying object of an observable. This allows property accesses that do not create observations. This
is useful when passing data to external libraries, APIs, etc.

```tsx
const raw = unwrap(state.cart);
```

### `peek<T>(fn: () => T): T`

Reads properties without tracking them for observations.

```tsx
const value = peek(() => state.internalState);
```

### `silent(fn: () => void): void)`

Updates state without triggering callbacks or re-renders.

```tsx
silent(() => {
  state.metadata.accessed = true;
});
```

## License

MIT License

## Contributing

Contributions are welcome! Please visit the [GitHub repository](https://github.com/brombal/keck) to report issues or
submit pull requests.
