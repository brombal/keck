import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useInsertionEffect,
  useMemo,
} from "react";
import { configure, observe, reset } from "./";

export function useObserver<TData extends object>(data: TData): TData {
  const [, forceRerender] = useState({});
  const store = useMemo(() => observe(data, () => forceRerender({})), []);

  // Begin observing on render
  reset(store);
  configure(store, { clone: true });

  // Stop observing as soon as component finishes rendering
  useEffect(() => {
    configure(store, { observe: false });
  });

  // Disable callback when component unmounts
  useEffect(() => {
    return () => {
      reset(store);
      configure(store, { enabled: false });
    };
  }, [store]);

  return store;
}

export function useObserveSelector<TData extends object, TSelectorResult>(
  data: TData,
  selector: (state: TData) => TSelectorResult,
  action?: (result: TSelectorResult) => void
): [TSelectorResult, TData] {
  const [, forceRerender] = useState({});

  const selectorResultRef = useRef<TSelectorResult>();
  const state = useRef(
    observe(
      data,
      (state) => {
        return (selectorResultRef.current = selector(state));
      },
      (v) => {
        action?.(v);
        forceRerender({});
      }
    )
  ).current;

  useEffect(() => {
    return () => reset(state);
  }, []);

  return [selectorResultRef.current as TSelectorResult, state];
}
