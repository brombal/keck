import { observe, reset } from 'keck';
import { useRefWithDeps } from 'keck/react/useRefWithDeps';

/**
 * Returns an observable proxy for `data` that invokes the provided callback when `data` is
 * modified. The observable is unfocused, so it will invoke the callback for any changes.
 * The callback is only active while the component is mounted.
 *
 * The observable proxy is memoized based on the `deps` array. To re-initialize the data, provide
 * a dependency array that includes values that would indicate when to reset the state.
 *
 * @internal Internal use only. This is exported as the overloaded method `useObserver()`.
 * @param data The data to observe.
 * @param cb The callback to invoke when any observed property changes.
 * @param deps Optional dependency array to refresh the observable proxy reference.
 */
export function useObserverCallback<TData extends object>(
  data: TData,
  cb: () => void,
  deps?: unknown[],
): TData {
  return useRefWithDeps<TData>((previous) => {
    if (previous) reset(previous);
    const value = observe(data, cb);
    (globalThis as any)?.keckFinalizationRegistry?.register(value, 'Keck observable released');
    return value;
  }, deps || []).current;
}
