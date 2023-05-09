import React, { useState, useRef, useLayoutEffect, useEffect, useInsertionEffect } from "react";
import { createObserver } from "./";

export function useObservable<T extends object>(data: T) {
  const [, forceRerender] = useState({});
  const { store, reset, observe, unobserve } = useRef(
    createObserver(data, () => forceRerender({}))
  ).current;

  // Begin observing on render
  reset();
  observe();

  // Stop observing as soon as component finishes rendering
  useEffect(() => {
    unobserve();
  });

  // Disable callback when component unmounts
  useLayoutEffect(() => {
    return () => reset();
  }, []);

  return { store, observe, unobserve };
}
