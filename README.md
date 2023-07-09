# <img src="logo.svg" alt="Keck">

<br>

Keck.js is a library for working with **reactive state objects** in React (and vanilla JS).

You can use reactive state objects just like you would use any other value. They behave just like
the original value, except that modifying their properties will cause components that accessed those
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
- Works in all browsers that support [Proxy](https://caniuse.com/?search=Proxy)

---

## Install

```shell
npm install keck
# or
yarn add keck
```

## React Guide

### Creating an observable

In Keck, reactive state objects are referred to as **observables**. Observables are transparent
wrappers around a value that you want to observe for changes. Keck keeps track of what properties
you access during a component's render, and re-renders the component when those properties change.

To create an observable, use the `useObservable()` hook:

[example]

The component will _only_ re-render when a property that was accessed during the execution of the
render function is modified, but _not_ for properties that are only accessed in `useEffect`
callbacks, event handlers, etc.

`initialValue` can be an object, array, Map, Set, or even a [custom classes](#custom-classes).
Values can be deeply nested and composed of any of the supported types. You cannot pass primitives
directly (strings, numbers, booleans, etc) since they are immutable; it doesn't make sense to
"modify" them in a reactive way. If you have a single value you want to observe, simply wrap it in
an object:

[example]

Although the value that `useObservable` returns is a different object reference (i.e. it won't
compare as identical `===` to the original value), it is **not** a clone of the original value. It
contains a reference to the original value, and can be treated as if it _were_ the original value:
modifying the observable will modify the original value, and vice versa. This happens instantly (not
in subsequent renders, as with `useState`), so you can read from the value immediately after
modifying it.

### Sharing observable values

If you pass the same object reference to `useObservable()` in different components, they will all
share the same state—no boilerplate or React context necessary. Modifying the object in one
component will cause all the components observing that object to re-render.

[example]

### Deriving new values from an observable

You can **derive** new values from observables, causing the component to re-render only if the
_derived_ value changes. This can boost performance by preventing unnecessary re-renders.

To create a derived value, call `derive(() => ...)` with a callback that returns a new value based
on the properties of one or more observables:

[example]

The callback will be invoked immediately to derive the new value. **You can access any observables
from within the callback**, and the callback will be re-invoked whenever any of the observables'
properties that it accessed change. The component will then re-render only if the value returned by
the callback is different from the previous render.

#### Custom comparisons

Derived values are compared with their previous values using **strict equality** (`===`) by default.
You can pass a custom comparator as the second argument to `derive()` to customize how the values
are compared. This is useful for comparing derived objects and arrays (for example, with shallow
comparison). Keck provides a simple `shallowCompare` comparator for this purpose:

[example]

The comparator accepts two arguments: the previous value and the new value. It should return `true`
if the values are equal, and `false` if they are not.

#### Short-circuiting

Be cautious about short-circuiting boolean operations within the callback. For example, if you
derive a value such as `derive(() => state.a && state.b)`, and `state.a` is `false`, then `state.b`
will not be accessed, so the derivative function won't be re-invoked when `state.b` changes
(although cases where this actually matters would be rare).

### Observing all properties of a value

By default, accessing a nested object (or other observable type) within an observable will not cause
the component to re-render when the nested object changes. This is because you have to access these
**intermediate** values to get to their child properties (e.g. `userForm.profile.firstName`), and
Keck assumes that you are only interested in changes to the specific properties that you access.
This avoids unnecessary re-renders from changes to other properties of `userForm.profile`.

However, if you _do_ want the component to re-render when any descendant property of an intermediate
value changes, or when the intermediate value is directly reassigned (e.g.
`userForm.profile = emptyProfile`), you can explicitly observe the intermediate observable by
wrapping it in a call to `observe()`:

[example]

### Unwrapping an observable

In most cases, an observable looks and feels just like the original value. However, there are some
edge-case scenarios where the observable does not behave exactly as its plain counterpart. For
example, if you pass an observable to a third-party library that expects a plain value, it may not
work as expected.

To get the plain value from an observable, call `unwrap()`:

[example]

The returned value is not observable. Modifications to it will not cause the component to re-render,
but changes will still be reflected in the observable.

### Using custom classes

Keck supports using custom classes as observable values. To do this, you need to register your class
with Keck using `registerClass()`: