# Keck — Agent Reference

Proxy-based fine-grained observable state for React. Mutate the proxy directly; reads during render auto-subscribe that component to re-render only when those specific properties change. This file is a dense reference for AI agents using Keck in a downstream project — see `README.md` for narrative examples.

## Entry points

| Import | Exports |
|---|---|
| `keck` | `derive`, `deep`, `unwrap`, `peek`, `silent`, `atomic`, `observe`, `ref`, `isRef`, `reset`, `disable`, `enable`, `focus`, `shallowCompare`, `transformInPlace`, `registerObservableClass`, `initGarbageCollectionObservation` |
| `keck/react` | `useObserver`, `reactRef` |
| `keck/react/useSyncMemo` | `useSyncMemo` |

React 18.2+ is a peer dependency. No other runtime dependencies.

## Mental model

- `useObserver(data)` returns a **proxy wrapper** around `data`. It is not `===` to `data`.
- The proxy is **stable across renders** until a nested property changes, so it is safe to use as a `useEffect` / `useMemo` / `useCallback` dependency.
- **Reads during render** are tracked as observations. Reads in effects/handlers are not.
- **Writes to any proxy** for the same underlying object trigger re-renders everywhere in the app whose tracked properties changed.
- Only **primitive** reads (string/number/boolean/etc.) create subscriptions by default. Reading an object/array reference alone does not — use `deep()` or `derive()` to observe nested change.
- Implicit reads count: `.length` during `.map()`, iteration via `for...of`, etc., all create observations.
- Array mutators (`push`, `splice`, `sort`, …) and direct index assignment all notify observers.

## `useObserver` — three overloads

```ts
useObserver(data, deps?)                        // render-subscribed proxy
useObserver(data, cb, deps?)                    // render-subscribed proxy + sync cb on any change
useObserver(data, deriveFn, cb, deps?)          // render-subscribed proxy + sync cb when derived result changes
```

| Overload | Re-renders on tracked-prop change? | Invokes `cb`? |
|---|---|---|
| `(data, deps?)` | yes | — |
| `(data, cb, deps?)` | yes | yes (any change, **synchronously** inside the write) |
| `(data, deriveFn, cb, deps?)` | yes | yes (when `deriveFn` result changes, synchronously) |

The callback is an **orthogonal side-effect channel** — it is independent of render subscription. Use the callback overloads when you need to react synchronously to mutations (invariant enforcement, ordered logging, reactive writes that must land before the next statement). Prefer `useEffect` when sync timing doesn't matter — effects run post-commit and coalesce intermediate states.

Notes:

- `data` may be a plain object or an existing observable — it is always unwrapped internally.
- The object passed to `useObserver({ ... })` is memoized on first render — treat inline literals as initializers. To reset, change `deps` (the observer and its memoized object are recreated).
- Each component must call `useObserver` itself. **Do not share a proxy returned from one component with another** — pass the raw object or context value instead.
- When `data` is a stable shared object (module-level, context), `deps` is usually unnecessary. Pass `[data]` if the reference may change.

## Writing state

```ts
state.count++                  // fine
state.items.push(item)         // fine
state.user.name = 'x'          // fine
Object.assign(state.user, ...) // fine
```

- `atomic(fn, args?, thisArg?)` — batch multiple writes into a single notification pass.
- `silent(() => { ... })` — writes inside the callback do not trigger observer callbacks or re-renders.
- `transformInPlace(target, source)` — recursively mutate `target` to match `source`'s shape in place; preserves observer subscriptions to `target`. Top-level must both be plain objects or arrays.

## Reading state beyond direct access

- `derive(fn, isEqual?)` — Returns `fn()`'s value and re-renders the calling component only when the result changes by `isEqual` (default `===`). Pair with `shallowCompare` or a custom comparator for arrays/objects.
- `deep(obs)` — Marks `obs` for deep observation: any descendant change triggers a re-render. Required when you need an object/array itself to invalidate (e.g. `useEffect(..., [deep(state.user)])`). Returns its argument unchanged; safe inline in dep arrays. Non-observables pass through.
- `peek(() => state.x)` — Read without subscribing.
- `unwrap(state.x)` — Return the raw underlying object. Use when handing data to external libraries, fetch bodies, `JSON.stringify` of large graphs, or anything that shouldn't see the proxy. Property access on the unwrapped value does not observe.

## React helpers

- `reactRef<T>()` — Creates a React-compatible `RefObject<T>` safe to store inside an observable (e.g. `useObserver({ myRef: reactRef<HTMLDivElement>() })`, then `<div ref={state.myRef}>`). Access via `.current`.
- `useSyncMemo(factory, deps)` — Like `useMemo` but runs synchronously during render and passes the previous value to `factory` for cleanup. Returns the factory's result directly (subpath import: `keck/react/useSyncMemo`).

## Non-React usage

```ts
observe(value, cb?, deriveFn?, isEqual?)
```

Creates a standalone observer. Mirrors `useObserver` semantics outside React:
- `observe(value, cb)` — invoke `cb` on any observed property change.
- `observe(value, cb, deriveFn, isEqual?)` — invoke `cb` only when `deriveFn(state)` result changes.

Returned value is the proxy.

## Gotchas / anti-patterns

- **Don't cross-share proxies between components.** Each `useObserver` caller must create its own proxy from the same underlying object.
- **Never write directly to the raw underlying object.** Observers are only notified through the proxy's set trap — raw mutations are invisible to all observers (no callbacks fire, no re-renders). Always mutate through an observable proxy.
- **Object reference reads don't subscribe.** `state.user` alone is not enough; read a primitive, use `deep(state.user)`, or `derive(() => ...)`.
- **Never `===`-compare a proxy with its raw object.** Use `unwrap` first.
- **Don't pass proxies to external code.** Serializers, API clients, comparison libs, etc. may trigger unintended observations or break on the proxy. Call `unwrap` at the boundary.
- **`useObserver({...})` memoizes on mount.** Changing the inline literal alone does not update state — pass `deps` to re-init, or mutate properties.
- **Custom classes must be registered.** Instances of non-plain classes are not observable unless registered via `registerObservableClass(Ctor, factory?)`.

## Other utilities

- `shallowCompare(a, b)` — shallow equality helper for `derive`'s `isEqual`.
- `reset(observable)` — clears current observations on an observer (mainly non-React; React observers are managed by render).
- `disable(obs)` / `enable(obs)` — temporarily stop/resume callback firing for an observer.
- `focus(obs, enable?)` — toggles focused mode. React observers are always focused; relevant only for `observe()`-based usage.
- `isRef(value)` — test whether a value is a Keck ref.
- `initGarbageCollectionObservation(cb)` — opt-in hook for GC-driven cleanup instrumentation.

## Type surface

- `DeriveFn<T> = () => T`
- `DeriveEqualFn<T> = (prev: T, next: T) => boolean`
- `ObservableFactory<T>` — contract for `registerObservableClass`.

Full public types live in `index.d.ts` (core) and `react.d.ts` (React entry).
