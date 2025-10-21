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

Let's define an example state object:

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

- `AddToCartButton` only adds items to the cart. Keck will never re-render this component because it doesn't access any
  state properties during render:

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
of primitive values. Even if the component did re-render, using an object in a useEffect dependency array wouldn't
trigger the effect, because normally the object reference doesn't change when its properties are modified.

**The solution:** Calling `deep(state.user)` in a component render tells Keck to re-render the component when any
descendant property changes. Because Keck creates a new proxy wrapper whenever an object is modified, using it in a
dependency array will trigger effects or recompute `useMemo` and `useCallback` values.

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

### `useObserver<T>(value: T, deps?: unknown[]): T`

Creates an **observable** state object that tracks property access, and triggers re-renders when those properties
change.

- **`value`**: The state object to observe
- **`deps`** (optional): Dependency array for refreshing the state object when dependencies change

The returned value is an **observable** proxy wrapper around the original object that you can
read from and write to just like the original object.

Observables behave just like their underlying object, with some
important
differences:

- Reading properties during rendering **observes** them, so that changes to those properties trigger a re-render of the
  components that accessed them.
- Writing properties of an observable will
  **trigger re-renders** of all components that access those properties. This applies to all observables of the *same
  object, anywhere in your application*. Keck ensures
  **fine-grained reactivity**: components will only re-render
  when properties they accessed during their render are changed.
- Observable proxies are **not clones** of the original object, but rather *transparent wrappers* around them.
  Modifications to
  one observable
  will be immediately reflected in another; likewise, modifications directly to the underlying object will also be
  reflected in all observables wrapping that object (but will not trigger re-renders).
- Observable proxy wrappers are **not referentially equal** (`===`) to the underlying object. However, observables
  remain
  **stable between renders** *until any descendent property changes*—that is, the same proxy instance is returned on
  every render
  until a property is modified. This allows you to use observables in dependency arrays to trigger effects (or refresh
  useMemos and useCallbacks) when any
  nested property changes (if they are being observed—see `deep()` below for observing entire objects).
- Accessing deeply nested object or array properties of an observable will return observables for those nested values.
  The same behavior and rules apply to those nested observables.

#### Local State

Using `useObserver` is great for local component state, allowing you to easily and naturally read and modify a state object
without complex boilerplate.


```tsx
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

The value passed to `useObserver()` is memoized on the first render, effectively treating the inline object as an "initializer" and the returned observable
as a persistent state value for the lifetime of the
component. If you want to re-initialize the value (for example, to reset the state when some prop changes), pass a
dependency array as the second argument ot `useObserver()`. The observable will be recreated whenever any dependency
value changes.

#### Shared State

`useObserver` is equally powerful at observing shared state: objects that are passed from React context, props, module-level
variables,
etc. 

Every component calling `useObserver()` on the same object will share its state, and will be re-render whenever that object
is changed anywhere in the application. Keck ensures that only components that accessed the changed properties will re-render.

> When sharing state objects, be careful not to use observable proxies created by other components. Every component should
call `useObserver()` on the object to create its own proxy.


For shared state objects (e.g. from context or module-level variables), you typically don't need to pass dependencies
to `useObserver()` if
the object reference remains stable. If you expect the shared object reference to change (e.g. a context object that is
occasionally re-created), you can pass the object itself in the dependency array.

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
