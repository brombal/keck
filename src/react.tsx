import React, { useState, useRef, useEffect } from "react";
import { configure, createObserver, reset } from "./";

export function useObserver<TData extends object>(data: TData): TData {
  const [, forceRerender] = useState({});
  const ref = useRef<TData>();
  if (!ref.current) ref.current = createObserver(data, () => forceRerender({}));
  const state = ref.current;

  // Begin observing on render
  reset(state);
  configure(state, { clone: true });

  // Stop observing as soon as component finishes rendering
  useEffect(() => {
    configure(state, { select: false });
  });

  // Disable callback when component unmounts
  useEffect(() => {
    return () => {
      reset(state);
      configure(state, { enabled: false });
    };
  }, [state]);

  return state;
}

export function useObserveSelector<TData extends object, TSelectorResult>(
  data: TData,
  selector: (state: TData) => TSelectorResult,
  action?: (result: TSelectorResult) => void
): [TSelectorResult, TData] {
  const [, forceRerender] = useState({});

  const selectorResultRef = useRef<TSelectorResult>();
  const state = useRef(
    createObserver(
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
