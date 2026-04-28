# Mental Model

Keck is built around a small set of rules.

## Observables Are Proxies

`useObserver(data)` and `observe(data)` return proxy wrappers around the object you pass in. The proxy is not the same
reference as the raw object, but it reads and writes the same underlying data.

```ts
const raw = { count: 0 };
const state = observe(raw);

state.count++;
raw.count; // 1
```

Writes must go through the proxy when you want observers to be notified.

```ts
raw.count++; // observers do not know this happened
state.count++; // observers are notified
```

## Reads Create Subscriptions

In React, Keck tracks reads while a component renders.

```tsx
function UserName() {
  const state = useObserver(store);

  return <span>{state.user.name}</span>;
}
```

This component subscribes to `user.name`. It does not subscribe to every property in `user`.

In vanilla TypeScript, `observe()` is unfocused by default and callbacks run for any change. Use `focus()` when you want
to collect specific reads.

## Object Reads Are Not Whole-Tree Subscriptions

Reading `state.user` by itself does not mean "subscribe to every nested field." Use one of these instead:

- Read the specific primitive fields you render.
- Use `derive()` for computed values.
- Use `deep(state.user)` when any nested change should re-run an effect, recompute a memoized value, or notify a focused
  observer.

## Proxy References Change after Nested Writes

Keck keeps observable proxy references stable until a nested value changes. After a change, nested proxy references are
refreshed so dependency arrays can see that the observed object changed.

```tsx
useEffect(() => {
  saveUser(unwrap(state.user));
}, [deep(state.user)]);
```

`deep(state.user)` marks the current `state.user` proxy for nested tracking and returns that same proxy. When a nested
field changes later, Keck creates a fresh proxy for `state.user` on the next render. React compares the dependency array
by reference, sees the new proxy, and re-runs the effect.

## Derived Values Subscribe to Their Inputs

`derive()` runs a function, tracks what it reads, and only notifies observers when the result changes.

```ts
const canCheckout = derive(() => cart.items.length > 0 && session.signedIn);
```

Use a custom equality function for arrays and objects.

```ts
const ids = derive(
  () => cart.items.map((item) => item.id),
  shallowCompare,
);
```

## Arrays, Maps, and Sets Are Observable

Keck observes common collection operations.

- Arrays notify for index changes, length changes, and mutating methods such as `push`, `splice`, and `sort`.
- Maps notify for observed keys, `size`, iteration, and deep observation.
- Sets notify for observed values, `size`, iteration, and deep observation.

## `unwrap()` Crosses Boundaries

Observable proxies are convenient inside your app. Raw values are usually better for network requests, serializers,
comparison libraries, and third-party APIs.

```ts
await fetch("/api/profile", {
  method: "POST",
  body: JSON.stringify(unwrap(state.profile)),
});
```

## Each Component Gets Its Own Proxy

When sharing state in React, each component should call `useObserver()` for itself.

```tsx
const state = useObserver(store);
```

The `store` argument can be either the raw object or an existing Keck proxy. Exporting an observed store can be useful
when code outside the React tree also needs to mutate or observe the same state.

```ts
// store.ts
import { observe } from "keck";

export const store = observe({
  signedIn: false,
  userId: null as string | null,
});
```

```tsx
// Header.tsx
const state = useObserver(store);
```

The thing to avoid is creating a proxy inside one component and passing that component-owned proxy around as the shared
store. `useObserver()` unwraps observable proxies passed to it, so each component can still create and clean up its own 
observer.
