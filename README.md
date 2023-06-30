# <img src="logo.svg" alt="Keck">

<br>

Keck is a library for creating reactive objects in React and vanilla JS.

This means you can use objects (and other complex types) just like you normally would—and when you
modify them, your components will automatically re-render (in vanilla JS, your callback will be
invoked).

Features:

- Works with deeply nested structures
- Supports objects, arrays, Maps, Sets, [custom classes](#custom-classes), and is
  [extensible](#supporting-other-types)
- No dependencies
- Tiny (1.69KB gzipped)
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

### Creating a reactive observable value

`useObservable(initialValue)` returns an **observable** "wrapper" around the original value. When
you modify the observable value, your component will re-render.

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

The component will _only_ re-render when a property that was accessed during the execution of the
render function is modified, but _not_ for properties that are only accessed in `useEffect`
callbacks, event handlers, etc.

You can pass objects, arrays, Maps, Sets, and even [custom classes](#custom-classes) to
`useObservable()`. Objects can be deeply nested, and nested values can be of any of the different
supported types. You cannot pass primitives directly (strings, numbers, booleans, etc. are
immutable; it doesn't make sense to "modify" them in a reactive way), but you can wrap them in an
object.

Although the value that `useObservable` returns is a different object reference (it won't compare as
identical `===` to the original value), it is **not** a clone or copy. It can be treated as if it
_were_ the original value: modifying the observable will modify the original value, and vice versa.
This happens instantly (not in subsequent renders, as with `useState`), so you can read from the
value immediately after modifying it.

### Passing observables to child components

It is safe to pass observable values to child components as props. However, because observables
cannot be distinguished from "plain" values, child components should never assume they are receiving
observables from a prop value. Whether it receives an observable or a plain value, **your component
should always create its own observable for any value** by calling `useObservable()`.

[example]

It is perfectly acceptable to call `useObservable()` in different components with the same initial
value, even if the initial value may already be an observable.

### Creating a shared observable value

If you pass the same object reference to `useObservable()` in multiple components, they will all
share the same state—no boilerplate or React context necessary. Modifying the object in one
component will cause all the components observing that object to re-render.

[example]

### Deriving new values from an observable

You can **derive** new values from observables, and the component will only re-render if the derived
value changes. This can boost performance by preventing unnecessary re-renders.

To create a derived value, call `derive(cb)` with a callback that returns a new value based on the
properties of one or more observables:

[example]

The callback will be invoked immediately to derive the new value. **You can access any number of
observables from within the callback**, and it will be invoked again whenever any of the
observables' properties that it accesses change. The component will only re-render if the value
returned by the callback is different from the previous render. Note that the derived value that is
returned is _not_ an observable value.

#### Custom comparisons

Derived values are compared with their previous values using **strict equality** (`===`) by default.
You can pass a custom comparator as the second argument to `derive()` to customize how the values
are compared. This is useful for comparing derived objects and arrays (for example, with shallow
comparison). Keck provides a simple `shallowCompare` comparator for this purpose:

[example]

The comparator accepts two arguments: the previous value and the new value. It should return `true`
if the values are equal, and `false` if they are not.

#### Short-circuiting

**Be cautious** about short-circuiting boolean operations within the callback. For example, if you
have a derived value that is `derive(() => state.a && state.b)`, and `state.a` is `false`, then
`state.b` will never be accessed, so the derivative function will not be re-tested when `state.b`
changes (although cases where this actually matters would be rare).

### Observing intermediate values

When accessing a deeply nested value such as `state.deeply.nested.value`, only changes to the
`.value` property of `state.deeply.nested` will cause the component to be re-rendered. This prevents
unnecessary re-renders when something else (such as `state.deeply.nested.otherValue`) changes.

The `.deeply` and `.nested` properties are **intermediate** observables—they themselves are
observables, used to access and observe child properties—so accessing them does not cause the
component to re-render when they change.

This may seem obvious when accessing `state.deeply.nested.value`. But what if you want the component
to re-render when _any_ property of `state.deeply.nested` changes, or when `state.deeply.nested` is
completely reassigned (e.g. `state.deeply.nested = newValue`)?

To handle this, you can explicitly observe the intermediate observable by calling `observe()` on it:

[example]

This has two effects:

- It causes the component to re-render when the `.nested` property changes (including changes to any
  of its child or descendant properties).
- The `unwrap()` method returns the non-observable "plain" value, in order to avoid certain
  edge-case scenarios where the observable does not behave exactly as its plain counterpart.

### Unexpected observable behaviors

In most situations, observable values behave exactly like their plain counterparts. However, because
of the nature of observables, there are some edge cases where they behave differently. These are
rare, but it's important to be aware of them. Rather than describe all the edge cases, an
explanation of how observables work is probably more useful.

Observables 

#### Value swapping with array destructuring

---

shared state example

```jsx
const sharedState = { count: 1 };

function IncrementButton() {
  const state = useObservable(sharedState);
  return <button onClick={() => state.count++}>+</button>;
}

function Counter() {
  const state = useObservable(sharedState);
  return (
    <div>
      {state.count}
      <IncrementButton />
    </div>
  );
}
```

derivative example

```jsx
function Counter() {
  const state = useObservable({ count: 0 });

  // The component will only re-render if the value of isMultipleOf5 changes
  // (not every time the count changes)
  const isMultipleOf5 = derive(() => state.count % 5 === 0);

  return (
    <div>
      {isMultipleOf5 ? "Multiple of 5" : "Not a multiple of 5"}
      <button onClick={() => state.count++}>+</button>
    </div>
  );
}
```

## React guide

However, only modifying the _observable_ value will cause the component to re-render; modifying the
original value will not. You can use this to your advantage to avoid re-rendering the component when
you don't want to:

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

```jsx
const state = { count: 0 };
const observable = useObservable(state);

// This will not cause the component to re-render
state.count++;

// This will cause the component to re-render
observable.count++;
```

### Intermediate properties

When (and _only_ when) a value somewhere in a deeply nested data structure changes, all intermediate
values in that "branch" (up to the root object) will be new references in the next render. It's
great for useEffect dependencies:

```jsx
const [state] = useObservable({
  deeply: { nested: { value: "" } },
});

useEffect(() => {
  console.log(state.deeply.nested);
}, [state.deeply.nested]);

<input
  value={state.deeply.nested.value}
  onChange={(e) => (state.deeply.nested.value = e.target.value)}
/>;
```

However, by default, Keck **only observes properties that contain primitives** (or other
un-observable types like functions, etc). If you access properties of a nested object, Keck will not
re-render components when those "intermediate" properties change.

```js
// If you only read this in a render function...
console.log(state.deeply.nested.object);

// ...then this won't cause a re-render
state.deeply.nested.object.value = "new value";
```

> The "hobbies" example above only works because the `map()` function reads from the
> `state.hobbies.length` property (which is a primitive), and the `push()` method modifies it. This
> is what allowed the component to re-render when the user clicked the "Add Hobby" button.

If you want to explicitly observe an intermediate property, you can use the `unwrap()` function:

```jsx
import { unwrap, useObservable } from "keck";

function UnwrapExample() {
  const [state] = useObservable({
    deeply: { nested: { value: "" } },
  });

  useEffect(() => {
    console.log(state.deeply.nested);
  }, [unwrap(state.deeply.nested)]);

  return (
    <input
      value={state.deeply.nested.value}
      onChange={(e) => (state.deeply.nested.value = e.target.value)}
    />
  );
}
```

> Keep in mind, there are some cases where this is not necessary, even though it may appear to be.
> For example, using an array's `.map()` and `.push()` methods read and write from the `.length`
> property, so the component will still rerender.

```jsx
const [state] = useObservable({ hobbies: ["Programming"] });

useEffect(() => {
  console.log(state.hobbies);
}, [state.hobbies]);

return (
  <div>
    {state.hobbies.map((hobby, i) => (
      <input value={hobby} onChange={(e) => (state.hobbies[i] = e.target.value)} />
    ))}

    <button onClick={() => state.hobbies.push("")}>Add Hobby</button>
  </div>
);
```

```jsx
const profile = { name: "Keck", hobbies: ["Programming"] };

function Counter() {
  const [state] = useObservable(profile);

  useEffect(() => {
    // This will only run when `hobbies` change, not when `name` changes
    console.log(state.hobbies);
  }, [state.hobbies]);

  return (
    <div>
      <input value={state.name} onChange={(e) => (state.name = e.target.value)} />

      {state.hobbies.map((hobby, i) => (
        // There are better ways to do this, but hey it's an example
        <input key={i} value={hobby} onChange={(e) => (state.hobbies[i] = e.target.value)} />
      ))}

      <button onClick={() => state.hobbies.push("")}>Add Hobby</button>
    </div>
  );
}
```

```jsx
const [state] = useObservable({ name: "Keck", hobbies: ["Programming"] });

<div>
  My first hobby: {state.hobbies[0]}
  {/* Clicking this will not cause a re-render */}
  <button onClick={() => state.hobbies.push("")}>Add a hobby</button>
</div>;
```

---

- Guide
  - React
  - Vanilla JS
  - TypeScript support
- API
  - useObservable `function useObservable<T extends object>(data: T): T`
  - observe
    `function createObserver<T extends object>(data: T, callback: Callback): ObserverResponse<T>`
  - unwrap
  - observableFactories
  - Types
    - ObservableContext
    - Callback
    - ObserverResponse<T>
- Contributing
- License

```

```

```

```
