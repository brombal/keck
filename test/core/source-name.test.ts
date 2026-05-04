import type { ObserverCallbackContext } from 'keck';

import { atomic, focus, observe } from 'keck';
import { atomicAllowPromise } from 'keck/methods/atomic';
import { vi } from 'vitest';

describe('observer source name', () => {
  test('callback receives sourceName from the writing proxy', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'writer' });
    const cb = vi.fn();
    observe(data, cb);

    writer.value = 1;

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ sourceName: 'writer' });
  });

  test('callback receives undefined sourceName when writing proxy has no name', () => {
    const data = { value: 0 };
    const writer = observe(data);
    const cb = vi.fn();
    observe(data, cb);

    writer.value = 1;

    expect(cb).toHaveBeenCalledWith({ sourceName: undefined });
  });

  test('source name identifies the writing proxy, not the reading proxy', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'moduleA' });

    const cb = vi.fn();
    const reader = observe(data, { name: 'moduleB', focusable: true, onChange: cb });
    const { commit } = focus(reader);
    void reader.value;
    commit();

    writer.value = 1;

    expect(cb).toHaveBeenCalledWith({ sourceName: 'moduleA' });
  });

  test('focusable observer callback receives context', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'writer' });

    const cb = vi.fn();
    const reader = observe(data, { name: 'reader', focusable: true, onChange: cb });
    const { commit } = focus(reader);
    void reader.value;
    commit();

    writer.value = 1;

    expect(cb).toHaveBeenCalledWith({ sourceName: 'writer' });
  });

  test('atomic() batch preserves sourceName when all writes come from the same named proxy', () => {
    const data = { value: 0, other: 0 };
    const writer = observe(data, { name: 'writer' });
    const cb = vi.fn();
    observe(data, cb);

    atomic(() => {
      writer.value = 1;
      writer.other = 2;
    });

    expect(cb).toHaveBeenCalledWith({ sourceName: 'writer' });
  });

  test('atomic() batch results in undefined sourceName when writes come from different proxies', () => {
    const data = { value: 0, other: 0 };
    const writerA = observe(data, { name: 'moduleA' });
    const writerB = observe(data, { name: 'moduleB' });
    const cb = vi.fn();
    observe(data, cb);

    atomic(() => {
      writerA.value = 1;
      writerB.other = 2;
    });

    expect(cb).toHaveBeenCalledWith({ sourceName: undefined });
  });

  test('named proxy with no callback is valid and its name is used as sourceName', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'namedWriter' });
    const cb = vi.fn();
    observe(data, cb);

    writer.value = 1;

    expect(cb).toHaveBeenCalledWith({ sourceName: 'namedWriter' });
  });

  test('derive callback receives derived value and context as second argument', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'writer' });

    const cb = vi.fn();
    observe(data, {
      derive: (s) => s.value > 0,
      onChange: cb,
    });

    writer.value = 1;

    expect(cb).toHaveBeenCalledWith(true, { sourceName: 'writer' });
  });

  test('context object is typed correctly (compile-time)', () => {
    // Type-level test: callback parameter accepts ObserverCallbackContext
    const _cb: (ctx: ObserverCallbackContext) => void = (ctx) => {
      ctx.sourceName satisfies string | undefined;
      ctx.actionName satisfies string | undefined;
    };
    void _cb;
  });

  test('named atomic sets actionName on context', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'writer' });
    const cb = vi.fn();
    observe(data, cb);

    atomic('addToCart', () => {
      writer.value = 1;
    });

    expect(cb).toHaveBeenCalledWith({ sourceName: 'writer', actionName: 'addToCart' });
  });

  test('unnamed atomic does not set actionName on context', () => {
    const data = { value: 0 };
    const writer = observe(data, { name: 'writer' });
    const cb = vi.fn();
    observe(data, cb);

    atomic(() => {
      writer.value = 1;
    });

    expect(cb).toHaveBeenCalledWith({ sourceName: 'writer' });
  });

  test('named atomic with unnamed proxy gives actionName but no sourceName', () => {
    const data = { value: 0 };
    const writer = observe(data);
    const cb = vi.fn();
    observe(data, cb);

    atomic('processOrder', () => {
      writer.value = 1;
    });

    expect(cb).toHaveBeenCalledWith({ sourceName: undefined, actionName: 'processOrder' });
  });

  test('named atomic with args returns function result', () => {
    const result = atomic('myAction', (x: number) => x * 2, [21] as [number]);
    expect(result).toBe(42);
  });

  test('nested atomics use outermost action name', () => {
    const data = { value: 0, other: 0 };
    const writer = observe(data);
    const cb = vi.fn();
    observe(data, cb);

    atomic('outerAction', () => {
      writer.value = 1;
      atomicAllowPromise(() => {
        writer.other = 2;
      });
    });

    expect(cb).toHaveBeenCalledWith({ sourceName: undefined, actionName: 'outerAction' });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('writing through an unnamed proxy that has a callback uses its own name as source for other callbacks', () => {
    const data = { value: 0 };
    const cb1 = vi.fn();
    const writer = observe(data, { name: 'moduleA', focusable: true, onChange: cb1 });
    const { commit } = focus(writer);
    void writer.value;
    commit();

    // Another observer on the same data
    const cb2 = vi.fn();
    observe(data, cb2);

    // writer writes through itself; cb1 is the writing observer so it won't fire for itself,
    // but cb2 should receive 'moduleA' as sourceName
    writer.value = 1;

    expect(cb2).toHaveBeenCalledWith({ sourceName: 'moduleA' });
  });
});
