import { DeriveEqualFn } from 'keck';

/**
 * Returns an observable version of `data` that will cause the component to re-render when any of its observed properties change. This includes deep object properties,
 * Map/Set entries, and array elements (including implicit property access such as an array's `.length` if you use `.map()`, for example).
 *
 * **Observed properties** are properties that are accessed (read) while the component is rendering.
 *
 * ## Deep Observations
 *
 * Only properties with primitive values (string, number, boolean, null, undefined) are tracked for changes.
 * You can wrap an object in `deep()` to observe deep changes to nested objects or arrays. This will cause a re-render whenever any deep property within the object changes.
 *
 * Additionally, the object reference will change between renders if any deep property changes, which can be useful for dependency lists. E.g.:
 *
 * ```tsx
 * const state = useObserver({ filter: { search: '', tags: [] } });
 * useEffect(() => {
 *   // Effect will run when any deep property of state.filter changes
 * }, [deep(state.filter)]);
 * ```
 *
 * `deep()` simply returns the passed value, so the returned Proxy wrapper acts as an object reference that React will recognize as a changed object reference,
 * causing the effect to fire. Note that the underlying object is not a new copy—only the object reference of the Proxy wrapper changes.
 *
 * ## Sharing State
 *
 * You can pass a shared object reference (e.g. from props, context, a module-level variable, etc) to have multiple components share the same observable state.
 * Components that observe the same object will only re-render when the properties that they observed have changed.
 * For example, if Component A observes `state.a` and Component B observes `state.b`, changing `state.a` will only re-render Component A.
 * However, either component can modify any property on the shared state object, and the changes will be reflected in all components that observed that property.
 *
 * The object passed to `useObserver()` is memoized on the first render, and the observable object returned by `useObserver` will always be the same object reference.
 * You can provide a dependency array to `useObserver()` to have the object re-created when the dependencies change.
 * This is useful if you want to reset the observed object when certain values change.
 *
 * ## Mutation Callbacks
 *
 * If a `callback` is provided, it will be called on property changes, immediately before re-rendering. Note that if the keck state is
 * updated during a the render phase, this callback will also be invoked
 * synchronously during the render phase, so it should not cause any side effects (e.g. triggering more renders).
 */
declare function useObserver<TData extends object>(data: TData, deps?: unknown[]): TData;
/**
 * Hook that will observe `data`, and only re-render the component when the result of `deriveFn` changes.
 * Returns the result of `deriveFn`.
 */
declare function useDerived<TData extends object, TDerived>(data: TData, deriveFn: (state: TData) => TDerived, isEqual?: DeriveEqualFn<TDerived>): TDerived;

export { useDerived, useObserver };
