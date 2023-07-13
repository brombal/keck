# <img src="logo.svg" alt="Keck">

<br>

Keck.js is a library for managing **reactive state objects** in React and vanilla JS.

Use reactive state objects as you would use any other value. They operate just like the original
value, except that modifications to their properties prompt components that accessed those
properties to re-render.

```jsx
import { useObservable } from "keck";

function Counter() {
  const state = useObservable({ count: 0 });

  return (
    <div>
      {state.count}
      <button onClick={() => state.count++}>+</button>
    </div>
  );
}
```

Features:

- Supports objects, arrays, Maps, Sets, [custom classes](#custom-classes), and is
  [extensible](#supporting-other-types)
- Works with deeply nested structures
- No dependencies
- Tiny (~2.5KB gzipped)
- 100% test coverage
- Compatible with all browsers that support [Proxy](https://caniuse.com/?search=Proxy)

---

## Install

```shell
npm install keck
# or
yarn add keck
```

## React Guide

### Creating an observable

In Keck, **observables** refer to reactive state objects. These are transparent wrappers around
values you wish to observe for changes. Keck tracks properties accessed during a component's render
and re-renders the component when these properties change.

Create an observable using the `useObservable()` hook:

```jsx
import { useObservable } from "keck";

function ShoppingCart() {
  const cart = useObservable({
    products: [],
    coupon: "",
  });

  //...
}
```

The component will _only_ re-render when a property accessed during the render function execution is
modified, but _not_ for properties accessed solely in `useEffect` callbacks, event handlers, etc.

The `initialValue` can be an object, array, Map, Set, or even a [custom class](#custom-classes).
Values can be deeply nested and composed of any of the supported types. You can't pass primitives
directly (like strings, numbers, booleans, etc) as they're immutable and, thus, can't be "modified"
reactively. If you want to observe a single value, simply wrap it in an object:

```jsx
import { useObservable } from "keck";

function Price() {
  const state = useObservable({ price: 19.99 });
  //...
}
```

Although the value `useObservable` returns is a different object reference (i.e., it won't compare
as identical `===` to the original value), it's **not** a clone of the original value. It holds a
reference to the original value and behaves as if it _were_ the original value. Modifying the
observable modifies the original value, and vice versa. This happens instantly (not in subsequent
renders, as with `useState`), allowing you to read from the value immediately after modifying it.

### Sharing observable values

Passing the same object reference to `useObservable()` in different components enables shared
state—no boilerplate or React context needed. Modifying the object in one component causes all
components observing that object to re-render.

In ES6 or TypeScript, this could be accomplished as simply as exporting the shared value from a
module:

```tsx
// cart.ts

export interface ShoppingCart {
  products: Array<{
    id: string;
    price: number;
    quantity: number;
  }>;
  coupon: string;
}

export const sharedCart: ShoppingCart = {
  products: [],
  coupon: "",
};

// You could even create a custom hook to easily
// create an observable cart:

export function useCartObservable() {
  return useObservable(sharedCart);
}
```

```tsx
// Header.tsx

import { useCartObservable } from "./cart";

function Header() {
  const cart = useCartObservable();

  return (
    <header>
      <div>Total items in cart: {cart.itemCount}</div>
      <label>
        Coupon:
        <input value={cart.coupon} onChange={(e) => (cart.coupon = e.target.value)} />
      </label>
    </header>
  );
}
```

You could even create a custom hook to easily create an observable version of the cart:

```tsx
// cart.ts

// ...

export function useCartObservable() {
  return useObservable(sharedCart);
}
```

### Deriving new values from an observable

You can **derive** new values from observables, leading the component to re-render only if the
_derived_ value changes. This can enhance performance by preventing unnecessary re-renders.

To create a derived value, call `derive(() => ...)` with a callback that returns a new value based
on one or more observables' properties:

```jsx
import { useObservable, derive } from "keck";
import { useCartObservable } from "./cart";

function ShippingCost() {
  const cart = useCartObservable();

  // We want to display a "free shipping" label, but only when the total cost of items in the
  // cart exceeds $50. This value will be derived from the `cart` observable
  const totalCost = derive(() =>
    cart.products.reduce((total, product) => total + product.price * product.quantity, 0)
  );

  //... other parts of the component
  return <>{totalCost > 50 ? <div>Free shipping!</div> : <div>Shipping: $10</div>}</>;
}
```

Your callback will be invoked immediately to derive the new value. **You can access any observables
from within the callback**, and the callback is re-invoked when any accessed properties change. The
component will then re-render only if the returned value differs from the previous render.

#### Custom comparisons

Derived values are compared to their previous values using **strict equality** (`===`) by default.
Pass a custom comparator as the second argument to `derive()` to customize value comparisons. This
is useful for comparing derived objects and arrays (for example, with shallow comparison). Keck
provides a simple `shallowCompare` comparator for this:

```jsx
import { useObservable, derive, shallowCompare } from "keck";
import { useCartObservable } from "./cart";

function ShoppingCart() {
  const cart = useCartObservable();

  // We want to display a list of products in the cart, but re-render only when a product
  // is added or removed, not when a product's quantity is changed.
  const productList = derive(() => cart.products.map((p) => p.id), shallowCompare);

  // productList will now only change when a product is added or removed, not when quantities change
  // ... rest of the component
}
```

The comparator accepts two arguments: the previous value and the new value. It should return `true`
if the values are equal, and `false` if they are not.

```jsx
import { useObservable, derive } from "keck";

function TotalCost() {
  const cart = useCartObservable();

  const totalCost = derive(
    () => {
      // Calculate total cost of products in the cart.
      return cart.products.reduce((total, product) => total + product.price * product.quantity, 0);
    },
    (prev, next) => {
      // Custom comparison function that considers the values to be equal
      // if the difference is less than or equal to $1.
      return Math.abs(prev - next) <= 1;
    }
  );

  return (
    <div>
      <h2>Total Cost: ${totalCost.toFixed(2)}</h2>
    </div>
  );
}
```

#### Short-circuiting

Exercise caution with short-circuiting boolean operations within the callback. Depending on the
arrangement of values and boolean operators, expressions may be skipped and values never accessed,
and consequently the derivative function won't be re-invoked when the skipped values change.

Often, this can be beneficial, as in an expression such as `state.a && state.b`, the value of
`state.b` is irrelevant until `state.a` is true. The component should only re-render when `state.b`
changes if `state.a` is true.

However, there are cases where this can lead to unexpected behavior. Consider the following
(extremly contrived) component, which won't re-render correctly:

```jsx
import { useObservable, derive } from "keck";

function XorGate() {
  const state = useObservable({
    a: false,
    b: false,
  });

  // Derived value using short-circuiting.
  // This would NOT work, because while changing `b` affects the outcome,
  // `b` is not accessed at all when `a` is false, so no observation is created.
  const gateOutput = derive(() => state.a ^ state.b);
  //                                      ^ the "exclusive or" operator

  // Other correct options:
  // const gateOutput = derive(() => state.a && state.b || !state.a && !state.b);
  // const gateOutput = derive(() => state.a !== state.b);
  // const gateOutput = derive(() => (state.a, state.b, state.a ^ state.b));

  return (
    <div>
      <button onClick={() => (state.b = !state.b)}>Toggle B</button>
      XOR Gate Output: {gateOutput ? "On" : "Off"}
    </div>
  );
}
```

### Unwrapping an observable

In most scenarios, an observable looks and feels just like the original value. However, there are
edge cases where the observable doesn't behave exactly like its plain counterpart. For instance,
logging an observable to the console will show the observable wrapper value instead of the value
itself (which might be interesting, but not really useful). Similarly, passing an observable to a
third-party library expecting a plain value might not work as expected.

To get the plain value from an observable, wrap it in a call to `unwrap()`:

```jsx
import { useObservable, unwrap } from "keck";
import { useCartObservable } from "./cart";

function CartDebugger() {
  const cart = useCartObservable();

  return (
    <button
      onClick={() => {
        // Log the plain value, not the observable wrapper
        console.log(unwrap(cart));
      }}
    >
      Log Cart
    </button>
  );
}
```

Note that this only applies to object, arrays, and other complex observable types. Primitive values
like strings and numbers are always unwrapped—there's no need to call `unwrap()` on them.

### Observing all properties of a value

When you access a "deep" property of an observable (e.g. `cart.products[0].quantity`), Keck assumes
you are only interested in that specific property, and will avoid unnecessary re-renders when other
parts of `cart.products` change.

However, if you _do_ want the component to re-render when any descendant property of an intermediate
value changes, or when the intermediate value is directly reassigned (e.g.
`cart.products[0] = otherProduct`), you can explicitly observe the intermediate values by wrapping
them in a call to `observe()`:

```jsx
import { useObservable, unwrap } from "keck";
import { useCartObservable } from "./cart";

function ProductListJSON() {
  const cart = useCartObservable();

  // observe the whole product list for changes
  const products = observe(cart.products);

  return <pre>{JSON.stringify(products, null, 2)}</pre>;
}
```

`observe()` returns the **unwrapped** value, just like `unwrap()`. (In fact, the only difference
between `observe()` and `unwrap()` is that `observe()` will cause a component re-render when the
intermediate value changes, while `unwrap()` will not.)

#### Object Cloning

Keck.js ensures that React's `useEffect` (and similar) callbacks function correctly by cloning each
object in the path of a modified value. If you modify a nested property within an observable object,
every parent object up to (but not including) the root will be cloned. This allows callbacks that
have dependency lists with these objects to be triggered correctly, as the references will have
changed.

While it's valid to pass an observable object to a dependency list, don't forget that you must
either be observing the object itself (with `observe()`) or accessing a primitive property of the
object (e.g. `cart.products[0].quantity`) in order for the component to re-render on changes.

```jsx
import { useObservable } from "keck";
import { useEffect } from "react";

function useProductListLogger() {
  const cart = useObservableCart();

  // observe() is necessary to cause the component to re-render when any
  // descendent property of cart.products changes
  observe(cart.products);

  useEffect(() => {
    console.log("Products:", cart.products);
  }, [cart.products]); // <-- this could also be [observe(cart.products)] if you prefer
}
```
