import { DeriveEqualFn } from 'keck';

declare function useObserver<TData extends object>(data: TData, callback?: () => void): TData;
/**
 * Hook that will observe `data`, and only re-render the component when the result of `deriveFn` changes.
 * Returns the result of `deriveFn`.
 */
declare function useDerived<TData extends object, TDerived>(data: TData, deriveFn: (state: TData) => TDerived, isEqual?: DeriveEqualFn<TDerived>): TDerived;

export { useDerived, useObserver };
