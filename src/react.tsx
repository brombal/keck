import React, { useState, useRef, useLayoutEffect, useEffect, useInsertionEffect } from "react";
import { observe } from "./";

export function useObserver<T extends object>(
  data: T
): [T, { start: () => void; stop: () => void }] {
  const [, forceRerender] = useState({});
  const [store, { reset, start, stop }] = useRef(observe(data, () => forceRerender({}))).current;

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

  return [store, { start, stop }];
}
