# Keck — Agent Reference

Proxy-based fine-grained observable state for React. Mutate the proxy directly; reads during render auto-subscribe that component to re-render only when those specific properties change. This file is a dense reference for AI agents using Keck in a downstream project — see `README.md` for narrative examples.

## Entry points

| Import | Exports |
|---|---|
| `keck` | `configure`, `resetConfiguration`, `derive`, `deep`, `unwrap`, `peek`, `silent`, `atomic`, `observe`, `unobserve`, `ref`, `isRef`, `reset`, `disable`, `enable`, `focus`, `fromSnapshot`, `shallowCompare`, `transformInPlace`, `registerObservableClass`, `initGarbageCollectionObservation` |
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
- **Always observe the root object.** Every component calls `useObserver(store)` with the same root — never a sub-object or nested slice. Fine-grained re-renders are automatic from what each component reads. The recommended pattern for a shared store is a wrapper hook: `export function useStore() { return useObserver(store); }`.

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
- `silent(() => { ... })` — writes inside the callback do not trigger observer callbacks or re-renders. Useful when you must write through a proxy but don't want subscribers to react (e.g. resetting derived UI state). For silent initialization of module-level state, prefer mutating the raw object directly — callbacks only fire through the proxy, so writes to the underlying raw object are inherently silent.
- `transformInPlace(target, source)` — recursively mutate `target` to match `source`'s shape in place; preserves observer subscriptions to `target`. `target` must be a Keck proxy — passing the raw underlying object mutates it correctly but triggers no observer notifications. Use this instead of `Object.assign` when you need fine-grained per-property notifications (so only components subscribed to changed properties re-render). For silent initialization, mutate the raw object directly instead.

## Reading state beyond direct access

- `derive(fn, isEqual?)` — Returns `fn()`'s value and re-renders the calling component only when the result changes by `isEqual` (default `===`). Pair with `shallowCompare` or a custom comparator for arrays/objects.
- `deep(obs)` — Marks `obs` for deep observation: any descendant change triggers a re-render or invalidates the dep. Required for focused observers (React render subscriptions, manual `focus()` sessions) when you need an object/array reference itself to invalidate (e.g. `useEffect(..., [deep(state.user)])`). Returns its argument unchanged; safe inline in dep arrays. Non-observables pass through. **`deep()` has no effect on unfocused `observe()` callbacks** — those already fire on every mutation regardless.
- `peek(() => state.x)` — Read without subscribing.
- `unwrap(state.x)` — Return the raw underlying object. Use when handing data to external libraries, fetch bodies, `JSON.stringify` of large graphs, or anything that shouldn't see the proxy. Property access on the unwrapped value does not observe.

## React helpers

- `reactRef<T>()` — Creates a React-compatible `RefObject<T>` safe to store inside an observable (e.g. `useObserver({ myRef: reactRef<HTMLDivElement>() })`, then `<div ref={state.myRef}>`). Access via `.current`.
- `useSyncMemo(factory, deps)` — Like `useMemo` but runs synchronously during render and passes the previous value to `factory` for cleanup. Returns the factory's result directly (subpath import: `keck/react/useSyncMemo`).

## Non-React usage

```ts
observe(value, cb?, deriveFn?, isEqual?)
```

Creates a standalone observer outside React. Returns a writable proxy.

- `observe(value)` — proxy only; no callback. Use as a shared module-level store that components subscribe to via `useObserver(store)`.
- `observe(value, cb)` — **unfocused mode** (default): `cb` fires on any mutation through any proxy for the same underlying data. No property reads, `deep()`, or `focus()` required — the callback fires unconditionally on every change.
- `observe(value, { derive, onChange, isEqual? })` — `onChange` fires only when `derive(state)` result changes.

**Observers with callbacks are held strongly** — the library keeps a strong reference to any observer created with a callback. Call `unobserve(proxy)` when the observer is no longer needed to release it and stop future callbacks.

**Callbacks only fire through the proxy.** Writes to the raw underlying object (or via `unwrap()`) bypass all callbacks entirely. This is the natural approach for silent initialization — keep a reference to the raw object and mutate it directly:

```ts
const rawData = { count: 0 };
export const store = observe(rawData);         // proxy for all normal mutations
observe(store, () => save(unwrap(store)));      // fires on any proxy mutation

// Init: mutate raw object — no callbacks fire
async function init() {
  const saved = await load();
  Object.assign(rawData, saved);
}
```

## Gotchas / anti-patterns

- **Don't cross-share proxies between components.** Each `useObserver` caller must create its own proxy from the same underlying object.
- **Raw object mutations are invisible to all observers** — no callbacks fire, no re-renders. This is intentional for silent initialization (see Non-React usage). For all normal state changes that should propagate to subscribers, always mutate through the proxy.
- **Object reference reads don't subscribe.** `state.user` alone is not enough; read a primitive, use `deep(state.user)`, or `derive(() => ...)`.
- **Never `===`-compare a proxy with its raw object.** Use `unwrap` first.
- **Don't pass proxies to external code.** Serializers, API clients, comparison libs, etc. may trigger unintended observations or break on the proxy. Call `unwrap` at the boundary.
- **`useObserver({...})` memoizes on mount.** Changing the inline literal alone does not update state — pass `deps` to re-init, or mutate properties.
- **Custom classes must be registered.** Instances of non-plain classes are not observable unless registered via `registerObservableClass(Ctor, factory?)`.

## Other utilities

- `configure({ onError? })` — set a global error handler. `onError` receives any error thrown by an observer callback or derive function during notification. Without `onError`, errors are rethrown via `setTimeout` so they appear as uncaught exceptions without silently swallowing them.
- `resetConfiguration()` — clear global config (resets `onError` and any other options).
- `unobserve(state)` — release a callback-based observer created with `observe(value, cb)` or `observe(value, { onChange })`. Must be called to prevent leaks; the proxy remains valid for reads/writes after the call.
- `fromSnapshot(obs, snap)` — rehydrate an observable from a plain-object snapshot using `transformInPlace`.
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
