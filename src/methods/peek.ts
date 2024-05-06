let peeking = false;

export function isPeeking() {
  return peeking;
}

export function peek<T>(fn: () => T): T {
  peeking = true;
  try {
    return fn();
  } finally {
    peeking = false;
  }
}
