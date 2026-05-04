// @vitest-environment node

import { atomic, connectDevTools, observe } from 'keck';
import { vi } from 'vitest';

describe('Node.js / SSR compatibility', () => {
  test('observe works without a DOM', () => {
    const data = { count: 0, name: 'test' };
    const cb = vi.fn();
    const store = observe(data, cb);

    store.count = 1;
    expect(cb).toHaveBeenCalledTimes(1);
    expect(store.count).toBe(1);
  });

  test('atomic batching works without a DOM', () => {
    const data = { a: 0, b: 0 };
    const cb = vi.fn();
    const store = observe(data, cb);

    atomic(() => {
      store.a = 1;
      store.b = 2;
    });

    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('derive works without a DOM', () => {
    const data = { x: 2, y: 3 };
    const cb = vi.fn();
    const store = observe(data, { derive: (s) => s.x + s.y, onChange: cb });

    store.x = 10;
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('connectDevTools returns a no-op in Node (DevTools not present)', () => {
    const data = { value: 0 };
    let disconnect: (() => void) | undefined;
    expect(() => {
      disconnect = connectDevTools(data);
    }).not.toThrow();
    expect(typeof disconnect).toBe('function');
    expect(() => disconnect!()).not.toThrow();
  });
});
