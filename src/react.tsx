import React, { useState, useRef, useLayoutEffect, useEffect, useInsertionEffect } from "react";
import { observe, ObserverActions } from "./";

export function useObserver<TData extends object>(data: TData): TData {
  const [, forceRerender] = useState({});
  const [store, actions] = useRef(observe(data, () => forceRerender({}))).current;

  // Begin observing on render
  actions.reset();
  actions.start();

  // Stop observing as soon as component finishes rendering
  useEffect(() => {
    actions.stop();
  });

  // Disable callback when component unmounts
  useEffect(() => {
    return actions.reset;
  }, []);

  return store;
}

export function useObserveSelector<TData extends object, TSelectorResult>(
  data: TData,
  selector: (state: TData) => TSelectorResult,
  action?: (result: TSelectorResult) => void
): [TSelectorResult, TData] {
  const [, forceRerender] = useState({});

  const selectorResultRef = useRef<TSelectorResult>();
  const [state, actions] = useRef(
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
    return () => actions.stop();
  }, []);

  return [selectorResultRef.current as TSelectorResult, state];
}
