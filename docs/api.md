# API Reference

## Entry Points

```ts
import { observe, derive, deep } from "keck";
import { useObserver, reactRef } from "keck/react";
```

| Entry point | Exports |
| --- | --- |
| `keck` | `observe`, `derive`, `deep`, `focus`, `unwrap`, `peek`, `silent`, `atomic`, `connectDevTools`, `ref`, `isRef`, `reset`, `disable`, `enable`, `shallowCompare`, `transformInPlace`, `registerObservableClass`, `initGarbageCollectionObservation` |
| `keck/react` | `useObserver`, `reactRef` |

## React

### `useObserver<TData extends object>(data: TData, deps?: unknown[]): TData`

Returns an observable proxy for `data`. Reads during render subscribe the component to matching future writes.

```tsx
const state = useObserver({ count: 0 });
```

For inline objects, `data` acts as an initializer: the object passed on the first render (or after deps change) becomes the observable state. Passing a new literal on a later render does not reset or replace that state.

For shared/external objects, `data` is the object to observe. Each component calling `useObserver(store)` gets its own observer over the same underlying object.

The `deps` array tears down the current observable and recreates it from the current `data` value whenever a dependency changes.

### `useObserver<TData extends object>(data: TData, cb: () => void, deps?: unknown[]): TData`

Returns the same render-subscribed observable as `useObserver(data)` and also invokes `cb` synchronously when any
property of the underlying data is changed through a Keck proxy.

The callback is independent from render subscriptions. Reads during render decide whether the component re-renders.
They do not limit which writes can fire `cb`.

`data` follows the same initializer semantics as `useObserver(data, deps?)`.

### `useObserver(data, { derive, onChange, isEqual? }, deps?)`

```ts
function useObserver<TData extends object, TDerived>(
  data: TData,
  config: {
    derive: (state: TData) => TDerived;
    onChange: (derived: TDerived) => void;
    isEqual?: (prev: TDerived, next: TDerived) => boolean;
  },
  deps?: unknown[],
): TData;
```

Returns the same render-subscribed observable as `useObserver(data)` and also invokes `onChange` synchronously when the
derived result changes.

The derive function establishes its own observations. The callback does not depend on which properties are read during
render. It is acceptable to ignore the returned state if the component only needs to keep the derived callback active
while mounted.

`data` follows the same initializer semantics as `useObserver(data, deps?)`.

### `reactRef<T>(): RefObject<T>`

Creates a React-compatible ref object that is safe to store inside observable state.

```tsx
const state = useObserver({
  input: reactRef<HTMLInputElement>(),
});
```

## Core Observation

### `observe(value, cb?)`

```ts
function observe<TValue extends object>(value: TValue, cb?: () => void): TValue;
```

Creates an observable proxy outside React. The callback fires synchronously for any real change.

```ts
const state = observe({ count: 0 }, () => console.log("changed"));
```

### `observe(value, { focusable: true, onChange })`

```ts
function observe<TValue extends object>(
  value: TValue,
  config: { focusable: true; onChange: () => void },
): TValue;
```

Creates a focusable observer. The callback fires only for properties read during a `focus()` session. Use this when you want the observer to track a specific set of reads rather than firing on every change.

```ts
const cart = observe(
  { items: [] as string[], couponCode: "" },
  { focusable: true, onChange: () => console.log("changed") },
);

const session = focus(cart);
void cart.items.length;
session.commit();

cart.couponCode = "SAVE10"; // no callback — couponCode wasn't focused
cart.items.push("sku_1");   // callback fires
```

### `observe(value, { derive, onChange, isEqual? })`

```ts
function observe<TValue extends object, TDerived>(
  value: TValue,
  config: {
    derive: (state: TValue) => TDerived;
    onChange: (derived: TDerived) => void;
    isEqual?: (prev: TDerived, next: TDerived) => boolean;
  },
): TValue;
```

Creates an observable proxy where `onChange` fires only when the derived result changes. `isEqual` defaults to strict
equality.

### `derive<T>(fn: () => T, isEqual?: (prev: T, next: T) => boolean): T`

Computes a value from observables and notifies only when the computed result changes.

```ts
const hasItems = derive(() => cart.items.length > 0);
```

### `deep<T>(observable: T): T`

Marks an observable object for deep tracking and returns it unchanged. Primitives, `null`, and values Keck does not know how to observe are returned as-is. Passing a plain observable-capable object (such as a raw `Map`) that is not yet wrapped in a Keck proxy throws an error.

```tsx
useEffect(() => {
  save(unwrap(state.profile));
}, [deep(state.profile)]);
```

The main use for `deep()` is as a React `useEffect` or `useMemo` dependency. This works because Keck invalidates and recreates child proxy references whenever a write propagates through their path — so after `state.profile.name` changes, `state.profile` returns a new proxy object on the next render. React's dependency comparison detects the new reference and re-runs the effect. Without `deep()`, reading `state.profile` during render only subscribes the component to direct replacement of the `profile` property, not to changes within it. See [Mental Model](mental-model.md#proxy-references-change-after-nested-writes) for details.

### `unwrap<T>(value: T): T`

Returns the raw underlying value for a Keck proxy. Non-observable values are returned unchanged.

### `peek<T>(fn: () => T): T`

Runs `fn` without creating observations for reads inside it.

### `atomic<T>(fn: (...args: unknown[]) => T, args?: unknown[], thisArg?: unknown): T`
### `atomic<T>(name: string, fn: (...args: unknown[]) => T, args?: unknown[], thisArg?: unknown): T`

Runs multiple writes and notifies observers once at the end. `fn` must be synchronous — passing an async function throws. If you need to batch writes after async work, await first and then call `atomic()`:

```ts
// Batch several writes into a single notification
atomic(() => {
  state.firstName = "Ada";
  state.lastName = "Lovelace";
});

// For async work: await first, then batch
const data = await fetchProfile();
atomic(() => {
  state.firstName = data.firstName;
  state.lastName = data.lastName;
});
```

Pass a name as the first argument to label the batch as a named action. The name appears as the action type in Redux DevTools and is available as `actionName` in observer callbacks:

```ts
atomic("updateProfile", () => {
  state.firstName = "Ada";
  state.lastName = "Lovelace";
});
```

The `args` and `thisArg` parameters let you invoke a reusable function atomically with specific call-site arguments. Most callers only need the first form.

```ts
function applyName(this: unknown, first: string, last: string) {
  state.firstName = first;
  state.lastName = last;
}

atomic(applyName, ["Ada", "Lovelace"], context);
atomic("updateProfile", applyName, ["Ada", "Lovelace"], context);
```

### `silent(callback: () => void): void`

Runs writes without notifying observers.

### `connectDevTools<T extends object>(store: T, options?: DevToolsOptions): () => void`

```ts
interface DevToolsOptions {
  name?: string;
}
```

Connects a store to the Redux DevTools Extension. Each mutation appears as an action in the DevTools panel. Returns a disconnect function.

```ts
const disconnect = connectDevTools(store, { name: "AppStore" });
```

Does nothing when the extension is not installed. See the [Redux DevTools guide](devtools.md) for full usage, named actions, and time-travel behavior.

## Observer Control

These are most relevant when using `observe()` outside React. The React integration manages them automatically.

### `focus(observable: object): FocusTransaction`

```ts
interface FocusTransaction {
  commit: () => void;
  discard: () => void;
}
```

Begins a focus session on a focusable observer (one created with `{ focusable: true }`). Property reads on the observable during the session are recorded. Call `commit()` to make those observations active — the observer's callback will fire when any of them are modified. Call `discard()` to abandon the session and restore the previous observations.

Both `commit()` and `discard()` are idempotent. If neither is called, a microtask queued at session start will discard automatically, covering abandoned renders or suspended work.

Throws if called on an observer that was not created with `{ focusable: true }`.

### `reset(observable: object): void`

Clears current observations for an observer. Only meaningful on focusable observers; non-focusable observers fire on every change regardless.

### `disable(observable: object): void`

Prevents an observer from firing callbacks. Retains all accumulated observations.

### `enable(observable: object): void`

Allows a disabled observer to fire callbacks again.

## Refs and Custom Observables

### `ref<T>(value: T): T`

Marks a value so its internals are excluded from observation. Writes to properties of a `ref`-wrapped value do not trigger callbacks or re-renders. Used internally by `reactRef()`.

Prefer `reactRef()` when storing a React DOM ref inside observable state. Use `ref()` directly when you need to store any other opaque external object — a WebSocket, a third-party class instance, a canvas context — that should not be observed.

```ts
import { observe, ref } from "keck";

const state = observe({
  socket: ref(new WebSocket("wss://example.com")),
});

// Writes to socket properties do not trigger observers
state.socket.onmessage = handleMessage;
```

See also [`isRef()`](#isref) in the Advanced section.

### `registerObservableClass(classConstructor: Function, factory?: ObservableFactory<any>): void`

Registers a custom class so instances can be observed.

```ts
class Counter {
  value = 0;
}

registerObservableClass(Counter);
const counter = observe(new Counter());
```

## Utilities

### `shallowCompare<T>(a: T, b: T): boolean`

Convenience shallow equality function for `derive()`. Returns `true` if both arguments have the same keys with the same values (checked with `Object.is`). Useful when a derived value is an array or plain object and you want to avoid re-renders when the contents are the same.

```ts
const cartItemIds = derive(
  () => state.cart.items.map((item) => item.id),
  shallowCompare,
);
```

### `transformInPlace<TSource>(target: unknown, source: TSource): TSource`

Recursively mutates a plain object or array `target` to match `source` while preserving the top-level reference. Useful for replacing the contents of an observable with fresh data from an API without creating a new object identity.

```ts
transformInPlace(state.profile, await fetchProfile());
```

## Advanced / Framework Integration

These APIs are intended for library authors implementing framework-specific integrations (React, Vue, Svelte, Solid, etc.) rather than for application code. Keck's React integration uses them internally. Most users should not need to call these directly.

### `isRef(value: unknown): boolean`

Returns `true` if `value` was marked with `ref()` or created by `reactRef()`. Useful when implementing custom observable factories or serialization utilities that need to skip ref-wrapped values.

```ts
import { isRef, ref } from "keck";

const wrapped = ref(new WebSocket("wss://example.com"));
isRef(wrapped); // true
isRef({});      // false
```

### `initGarbageCollectionObservation(cb: (heldValue: any) => void): () => void`

Registers a callback that fires whenever a Keck observable is garbage collected. Returns an unsubscribe function. Multiple callbacks can be registered independently.

Call before creating observables. Works with both `observe()` and `useObserver()`.

```ts
import { initGarbageCollectionObservation } from "keck";

const unsub = initGarbageCollectionObservation((heldValue) => {
  console.log("Observable GC'd:", heldValue); // heldValue is 'Keck observable released'
});

// Later, to stop receiving callbacks:
unsub();
```

Calling this function more than once registers an additional independent callback; each call returns its own unsubscribe function. The underlying `FinalizationRegistry` is created lazily on the first call and released automatically when all callbacks are unsubscribed.
