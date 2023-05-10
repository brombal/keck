import React, { useState, useRef, useLayoutEffect, useEffect, useInsertionEffect } from "react";
import { createObserver } from "./";

export function useObservable<T extends object>(data: T) {
  const [, forceRerender] = useState({});
  const { store, reset, start, stop } = useRef(
    createObserver(data, () => forceRerender({}))
  ).current;

  // Begin observing on render
  reset();
  start();

  // Stop observing as soon as component finishes rendering
  useEffect(() => {
    stop();
  });

  // Disable callback when component unmounts
  useLayoutEffect(() => {
    return () => reset();
  }, []);

  return { store, start: start, stop: stop };
}
