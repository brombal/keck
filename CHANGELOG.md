# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.4] - 2026-07-07

### Fixed

- Object/class getters that return an already-observable value are no longer double-wrapped. A getter runs with the observable proxy as its receiver, so reads inside it (e.g. `return this.data.nested`) produce observable children; the object factory previously wrapped that result in a second proxy, so `unwrap()` only peeled one layer and external code (`structuredClone`, serializers) received a live proxy. Getter results are now unwrapped before being wrapped for the reading observer, matching how the set trap normalizes written values. This notably affected `keck-forms`' `KeckForm.value` in `onSubmit` callbacks.

## [2.3.3] - 2026-07-07

### Changed

- Documentation: clarified derive-function subscription semantics (every read subscribes; object reads subscribe deeply, so `deep()` is never needed inside `derive`); documented the subtree-watching idiom (return the observed object from `derive` and let proxy identity drive change detection); noted that `onChange` receives a proxy for object results (`unwrap` before cloning — `structuredClone` throws on proxies); clarified callback-observer lifetime (held strongly by the observed data, so observers on shared/long-lived data need `unobserve` — use the `useObserver` overloads, which auto-release — while an observer whose data is created and dropped with it is GC'd as a group); documented that `Object.assign` on a proxy notifies per key unless wrapped in `atomic()`. Updated `AGENT_REFERENCE.md`, `docs/api.md`, `docs/react.md`, `docs/vanilla.md`.

### Fixed

- `constructor` accessed through an observable object or array is now returned as-is instead of being wrapped like other function-valued properties. The wrapper was a non-constructable arrow function, which broke identity checks (`observable.constructor === Array` was false) and third-party deep traversal — notably lodash's `cloneDeep`, which calls `new array.constructor()` on arrays and threw `array.constructor is not a constructor` when handed an observable array. This matches `ObservableSet`/`ObservableMap`, which already pin `constructor` to the native class.

## [2.3.1] - 2026-07-02

### Fixed

- Writes made by another observer during an active focus session are no longer silently lost. Previously, a cross-observer write to a property the session had already read (or to a committed observation from a prior session) was dropped because the mid-session observer's callback is disabled; the observer's callback now fires when the session settles. In React terms: a component that writes shared state during its render now correctly re-renders ancestor components that read that state earlier in the same render pass, instead of leaving them showing a stale value indefinitely. Writes made through the observer's own proxy are exempt (the render-adjustment pattern is unaffected), and stale notifications fired from a `commit()`/`discard()` inside `atomic()` join the atomic batch.
- A mid-session write to a pending-only observation (a path first read in the current session) no longer evicts the Observation from its only strong holder, which could cause notifications for that path to silently stop after a garbage collection pass.

## [2.3.0] - 2026-05-23

### Added

- Error isolation in `triggerObservations`: a throwing observer callback no longer aborts the notification chain — remaining observers still fire and the error is routed to the configured `onError` handler (or rethrown asynchronously if none is set, matching unhandled-promise-rejection semantics).
- `configure({ onError })` and `resetConfiguration()` exported from `keck`. `onError` receives any error thrown by an observer callback or derive function during notification. Without `onError`, errors are rethrown via `setTimeout` so they appear as uncaught exceptions without breaking the notification loop.
- A throwing derive function during re-invocation is treated as "changed" (the observer is notified) and the error is routed through `onError`.
- `unobserve(state)` exported from `keck`. Releases the callback registered for a proxy observer. Must be called to clean up observers created with `observe(value, cb)` or `observe(value, { onChange })`, which are now held strongly by the library and will not be garbage-collected on their own.
- `devtools()` API for inspecting observable state and tracing observations
- `fromSnapshot()` utility for rehydrating observable state from plain objects
- Config-object parameter style for `observe()` and `useObserver()`: `observe(data, { derive, onChange, isEqual? })` and `useObserver(data, { derive, onChange, isEqual? }, deps?)`
- Multi-version detection: if multiple keck instances are loaded in the same JS realm a console warning is emitted, helping diagnose bundling issues where a dependency (e.g. `keck-forms`) ships its own copy of keck.
- Observable factory registry is shared via `globalThis` so cross-version observable class registrations work correctly.
- React 18 Strict Mode, Suspense, abandoned-render, and concurrent mode test coverage
- Node.js / SSR smoke test confirming core observable APIs run without a DOM environment

### Changed

- Migrated test runner from Jest to Vitest

### Fixed

- `connectDevTools` no longer throws in non-browser environments (e.g. Node.js, SSR) — `window` access replaced with `globalThis`
- Eliminated unnecessary no-op observer allocation in render-only `useObserver(data)` calls, reducing GC pressure
- `useObserver` now uses `useSyncExternalStore` to address a theoretical tearing risk in React 18 concurrent mode. The previous `useState`-based re-render trigger is not what React prescribes for external stores; under concurrent rendering (transitions, Suspense) sibling components could in principle commit with inconsistent observable values. The fix aligns with React's documented external-store contract. Tearing in jsdom-based tests cannot be reliably reproduced because `act()` serializes all rendering.

## [2.2.0] - 2026-04-28

### Changed

- Replaced prior transaction primitive with a new `atomic()` API for batching state writes
- Improved React integration stability around render lifecycle edge cases

## [2.1.0] - 2026-04-28

### Added

- `initGarbageCollectionObservation()` API to enable automatic cleanup of unused observables

### Fixed

- General stability improvements

## [2.0.0] - 2026-04-28

### Added

- Complete rewrite of Keck as a proxy-based observable state library
- React 18 integration via `useObserver()` with fine-grained, subscription-accurate re-renders
- Direct mutation API — assign to observable properties and React re-renders automatically
- `observe()` for non-React usage
- `derive()`, `deep()`, `peek()`, `unwrap()`, `silent()`, `atomic()`, `reset()`, `focus()`, `disable()`, `enable()` utilities
- `reactRef()` helper for stable mutable refs in React
- `useSyncMemo()` hook for synchronous derived values in React

[Unreleased]: https://github.com/brombal/keck/compare/v2.3.0...HEAD
[2.3.0]: https://github.com/brombal/keck/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/brombal/keck/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/brombal/keck/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/brombal/keck/releases/tag/v2.0.0
