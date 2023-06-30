# Vanilla JS guide

Although Keck was created with React in mind, it is built on an underlying engine that is not
React-specific, and could be used in a vanilla JS environment or with another framework. This guide
will walk you through the basics of using Keck in a vanilla JS environment.

## Creating an observer

Create an observer using the `observe()` method. It accepts any observable value (plain objects,
arrays, Maps, Sets, and registered custom classes), and a callback function to be invoked when the
value is modified. It returns an _observable_ version of the given object—from your perspective,
this is just like the original value, and represents the _same_ value (not a clone!)

Keck invokes the given callback when any properties (including deeply nested ones) are modified.

```js
import { observe } from "keck";

const data = { deeply: { nested: { value: 0 } } };

const state = observe(data, (prop, parent, newValue, state) => {
  console.log("value:", newValue);
});

state.deeply.nested.value++; // ✅ logs "value: 1"
```

The callback receives the name of the property that was modified, the object containing that
property, the new value of the property, and the root state object.

### Multiple observers

You can create multiple observers for the same value, and **all the callbacks will be invoked when
any observer created from the same object is modified**. All observers created from the same object
represent the same data, and modifying one will modify the others.

```js
const data = { value: 0 };

const state1 = observe(data, () => {
  console.log("state1:", state1.value);
});

const state2 = observe(data, () => {
  console.log("state2:", state2.value);
});

state1.value++; // ✅ logs "state1: 1" and "state2: 1"
state2.value++; // ✅ logs "state1: 2" and "state2: 2"

state1.value === state2.value; // true
```

### Unwrapping observable values

Even though an observable value can be thought of and treated just like the original value, it is
sometimes necessary to "unwrap" the observable to access the underlying, raw value. This can be done
using the `unwrap()` utility function:

```js
import { unwrap, observe } from "keck";

const data = { value: 0 };

const state = observe(data, () => {
  console.log("value:", state.value);
});

unwrap(state); // { value: 0 }
```

Note that the unwrapped value _is_ the original value, not a clone. Modifying the unwrapped value
will modify the observable value, and vice versa (although the callback will not be invoked when the
unwrapped value is modified, of course).

Unwrapping a value also explicitly observes a value when it might not normally be observed (see
[Observing intermediate properties](#observing-intermediate-properties) below for more information).

## Configuring an observer

An observer has a few configuration options that alter its behavior. You can configure an observer
by calling `configure(state, config)`. An observer's configuration can be changed at any time.

```js
import { observe, configure } from "keck";

const state = observe({ value: 0 }, () => {
  console.log("value:", state.value);
});

configure(state, {
  select: true,
  clone: true,
  intermediates: true,
});
```

Here is a summary of the configuration options. All options default to `false`. More details about
each option are below.

| Option          | Value             | Description                                                                                                                                                                                                          |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `select`        | `boolean` `"all"` | When enabled, Keck will only invoke the callback when specific properties are modified. See [Observing specific properties](#observing-specific-properties) for more information.                                    |
| `clone`         | `boolean`         | When enabled, modifications to a deep property will cause all ancestor objects to be cloned, up to (but not including) the root value. See [Cloning modified values](#cloning-modified-values) for more information. |
| `intermediates` | `boolean`         | When enabled, Keck will create observations on intermediate objects when accessing deeply nested properties. See [Observing intermediate properties](#observing-intermediate-properties) for more information.       |

### Observing specific properties

By default, Keck invokes the callback when _any_ property is modified. To observe only specific
properties, you can enable **select mode**:

```js
configure(state, { select: true });
```

When you enable _select mode_, Keck immediately stops the default behavior of observing _all_
property modifications, and begins observing only the properties that you access while it is
enabled. The observable's callback will then only be invoked when the "selected" properties are
modified. You can end _select mode_ by calling `configure(state, { select: false })`.

```js
import { observe, configure } from "keck";

const data = { value1: 0, value2: 0 };

const state = observe(data, () => {
  console.log("data:", state);
});

configure(state, { select: true }); // Enable select mode

doSomethingWith(state.value2); // Now observing state.value2

configure(state, { select: false }); // End select mode

state.value1++; // ❌ does not log
state.value2++; // ✅ logs "data: { value1: 1, value2: 1 }"
```

After ending _select mode_, Keck will continue to invoke the callback for the currently observed
properties, but will no longer monitor for newly accessed ones. You can toggle _select mode_ on and
off at any time—properties accessed whenever _select mode_ is enabled will be added to existing
observed properties.

To revert to the default behavior and observe _all_ properties again, call
`configure(state, { select: 'all' })`, or reset the observer completely with `reset(state)` (note
that this resets the observer's other configurations to the defaults, too).

When you create multiple observers for the same value, each one can enter _select mode_
independently and have its own observed properties. **If an observer is observing a property,
modifying that property on _any other observer_ will trigger its callback.**

### Cloning modified values

It can be difficult to tell when a deeply nested property has changed, because callbacks are only
invoked for direct _child_ property modifications (not descendants), and object references remain
the same when a property has changed.

When **clone mode** is enabled, Keck will clone each parent value of a modified property, up to (but
not including) the root value. To enable clone mode, set the `clone` configuration property to
`true`:

```js
configure(state, { clone: true });
```

This is useful for comparing an object before and after it has been modified. This is important for
React's `useEffect()` hook, which needs to know if a value has changed between renders.

```js
const data = { deeply: { nested: { value: 0 } } };

const state = observe(data, () => {
  // ...
});

configure(state, { clone: true });

const before = state.deeply.nested;

state.deeply.nested.value++;

// ✅ This assertion succeeds because `state.deeply.nested` is now a new object reference.
assert(state.deeply.nested !== before);
```

It is also useful when you want to observe for modifications _somewhere_ in your data structure,
without needing to observe every descendant property. With _select mode_ and _clone mode_ enabled,
you can observe a specific property and be notified when any of its descendant properties are
modified:

```js
configure(state, { select: true, clone: true });

unwrap(state.deeply); // state.deeply is now being observed...

state.deeply.nested.value++; // ✅ this will trigger the callback
```

In this example, when `state.deeply.nested.value` changed, its ancestor `state.deeply` was cloned.
This change triggered the callback because it was being observed (note the use of `unwrap()` to
observe the intermediate property—see below for more information).

The cloning process works by performing a shallow clone (to preserve references of unmodified
"siblings"), and then repeating the process for each parent. The root value is _not_ cloned (since
you would lose the reference to it).

### Observing intermediate properties

By default, only the deepest properties of a nested data structure are observed. Because it may be
computationally expensive or undesirable to observe **intermediate properties**, this behavior must
be enabled.

To enable **intermediate mode** for all properties, set the observable's `intermediates` configuration property to `true`:

```js
configure(state, { intermediates: true });
```

When enabled, modifications to all intermediate properties will trigger
the callback (including when they are cloned):

```js
const data = { deeply: { nested: { value: 0 } } };

const state = observe(data, (prop) => {
  console.log(`"${prop}" changed!`);
});

configure(state, { select: true, clone: true, intermediates: true });

state.deeply.nested.value++;
// ✅ "value" changed!
// ✅ "nested" changed!
// ✅ "deeply" changed!
```

To observe a single intermediate property, use the `unwrap()` method:

```js
import { observe, configure, unwrap } from 'keck';

const data = { deeply: { nested: { value: 0 } } };

const state = observe(data, () => {
  // ...
});

configure(state, { select: true, clone: true });

unwrap(state.deeply.nested);

state.deeply.nested.value++; // ✅ This will trigger the callback
```

> Note that `unwrap()` is only necessary in _select mode_. **In non-select mode, the callback is
> always invoked** when any property is modified, regardless of whether it is intermediate or not.

### Limiting the callback with a derived value

Sometimes you may want the callback to be invoked only when the result of a value derived from the
state object changes. This is useful when you expect the value to change frequently, but the
callback is expensive to invoke (such as a React re-render). For example, you may want to observe
the length of an array (maybe the list of items in a shopping cart), but only be notified when the
length of the array changes from _0_ to _not 0_ or vice versa.

To do this, the `observe()` method accepts an additional callback called a _derivative function_
that returns a value derived from the state object. Whenever the values accessed in the function are
modified, it is invoked again and the return value is compared to the previous one. The observable's
callback is only invoked if the derived value has changed.

```js
const data = { cart: [] };

const state = observe(
  data,
  (state) => state.length === 0,
  (isEmpty) => console.log("cart is empty:", isEmpty)
);

state.cart.push("apples"); // logs "cart is empty: false"
state.cart.push("bananas"); // no log
state.cart.length = 0; // logs "cart is empty: true"
```

Note that _select mode_ and _intermediate mode_ are enabled inside the derivative function. This
means that only the properties that are accessed inside the derivative function (including
intermediate values) will be observed.

#### Custom comparison function

The `observe()` method can also accept an additional parameter to specify a custom comparator
function for the derivative function return values. By default, the comparison is done using
`Object.is`. You could provide a different comparison function, for example, to do a shallow
comparison:

```js
const data = { cart: [] };

const state = observe(
  data,
  // Only invoke the callback if the cart items have changed
  (state) => [...state.cart.map((item) => item.name)].sort(),
  (items) => console.log("cart items:", items),
  // Shallow array comparison
  (a, b) => a.length === b.length && a.every((item, i) => item === b[i])
);
```

#### Deriving multiple values

It is possible to derive multiple values from the same observable. While it is perfectly acceptable
to create multiple observables, each with their own derivative function, this API exists for
convenience (especially in React).

To create a derived value from an existing observable, use the `derive()` utility function:

```js
const data = { cart: [] };

const state = observe(data, () => {
  console.log({ sortedItemNames, has3items });
});

const uniqueItemNames = derive(() => [...new Set(state.cart)]);
const has3items = derive(() => state.cart.length >= 3);

state.cart.push("apple"); // logs { sortedItemNames: ["apples"], has3items: false }
state.cart.push("apple"); // no log (duplicate item)
state.cart.push("apple"); // logs { sortedItemNames: ["apples", "apples", "apples"], has3items: true }
```

Any properties accessed inside a derivative functions will be observed, and the derivative function
containing those properties will be invoked again whenever any of those properties change. The
callback will only be invoked if the return value of any of the derivative functions changes.

Note that you can also use the observable state object outside of the `derive` functions to create
additional, "normal" observations. Be aware that because modifications to properties observed
outside of the derivative functions would _always_ invoke the callback, the derivative function will
be skipped when they are modified.

### Resetting an observable

Resetting an observable will set its configuration back to the default state, and remove any
existing property observations. You can continue using an observable after it has been reset. Reset
an observable by calling `reset(state)`:

```js
import { observe, reset } from "keck";

const state = observe({ value: 0 }, () => {
  // ...
});

// ...

reset(state);
```
