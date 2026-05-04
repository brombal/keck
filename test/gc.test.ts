import { initGarbageCollectionObservation, observe, unobserve } from 'keck';
import { vi } from 'vitest';
import { createData } from './shared-data';

const data = createData();

// Persistent observer ensures that garbage collection is still triggered if multiple observers exist
(window as any).observer = observe(data);

describe('Garbage collection — proxy-only observers', () => {
  test('Smoke test for WeakRef', async () => {
    let ref: WeakRef<any>;

    const mockCleanupFn = vi.fn();
    const r = new FinalizationRegistry(mockCleanupFn);

    (() => {
      const value = {};
      ref = new WeakRef(value);
      r.register(value, 'value');
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(ref.deref()).toBeUndefined();
    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
  });

  test("Proxy-only observer is GC'd when not retained", async () => {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = vi.fn();
    const r = new FinalizationRegistry(mockCleanupFn);

    (() => {
      const state = observe(data);
      r.register(state, 'proxy');
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
  });
});

describe('Callback subscription lifetime', () => {
  test('Callback fires even when observe() result is not retained', async () => {
    expect(global.gc).toBeDefined();

    // Create a persistent observable to use as the write vehicle after GC
    const persistentState = observe(data);

    const mockCallback = vi.fn();

    // Common usage: register a callback without saving the returned proxy.
    // The proxy is the only strong reference to the Observer, so it is
    // immediately eligible for garbage collection.
    observe(data, mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Write through a different (persistent) proxy on the same data so the
    // mutation reaches all registered observers.
    persistentState.value1 = 'gc-test-value';

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Callback fires after GC when observe() result was never assigned', async () => {
    expect(global.gc).toBeDefined();

    const persistentState = observe(data);
    const mockCallback = vi.fn();

    observe(data, mockCallback);

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    persistentState.value1 = 'gc-test-value-2';

    expect(mockCallback).toHaveBeenCalledTimes(1);

    unobserve(persistentState); // cleanup — persistentState has no callback so this is a no-op
  });

  test('unobserve() is a no-op for non-observable objects', () => {
    // Should not throw when passed a plain object or proxy-only observable
    expect(() => unobserve({} as any)).not.toThrow();
    const proxy = observe(data); // proxy-only, no callback — unobserve is a benign no-op
    expect(() => unobserve(proxy)).not.toThrow();
  });

  test('Callback stops firing after unobserve()', () => {
    const persistentState = observe(data);
    const mockCallback = vi.fn();

    const state = observe(data, mockCallback);
    unobserve(state);

    persistentState.value1 = 'after-unobserve';

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Proxy remains usable for writes after unobserve()', () => {
    const mockCallback = vi.fn();
    const otherCallback = vi.fn();

    const state = observe(data, mockCallback);
    const other = observe(data, otherCallback);

    unobserve(state);

    // Writing through the unobserved proxy still triggers other observers
    state.value1 = 'written-after-unobserve';

    expect(mockCallback).toHaveBeenCalledTimes(0);
    expect(otherCallback).toHaveBeenCalledTimes(1);

    unobserve(other);
  });

  test('Focusable callback observer persists until unobserve()', () => {
    const persistentState = observe(data);
    const mockCallback = vi.fn();

    observe(data, { focusable: true, onChange: mockCallback });
    // result not saved — Observer is still held strongly

    // (no focus session, so callback won't fire for focusable — just verify no throw)
    persistentState.value1 = 'focusable-test';

    // focusable observer has no observations yet so callback does not fire
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });
});

describe('initGarbageCollectionObservation', () => {
  const unsubs: Array<() => void> = [];
  afterEach(() => {
    unsubs.splice(0).forEach((u) => void u());
  });

  test('callback fires when unobserve() is called on a callback observer', async () => {
    const gcCallback = vi.fn();
    unsubs.push(initGarbageCollectionObservation(gcCallback));

    const state = observe(data, vi.fn());
    unobserve(state);

    expect(gcCallback).toHaveBeenCalledWith('Keck observable released');
  });

  test('callback fires when proxy-only observe() result is garbage collected', async () => {
    const gcCallback = vi.fn();
    unsubs.push(initGarbageCollectionObservation(gcCallback));

    (() => {
      observe(data); // no callback — GC-based cleanup
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(gcCallback).toHaveBeenCalledWith('Keck observable released');
  });

  test('multiple callbacks all fire on unobserve()', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    unsubs.push(initGarbageCollectionObservation(cb1));
    unsubs.push(initGarbageCollectionObservation(cb2));

    const state = observe(data, vi.fn());
    unobserve(state);

    expect(cb1).toHaveBeenCalledWith('Keck observable released');
    expect(cb2).toHaveBeenCalledWith('Keck observable released');
  });

  test('unsubscribed callback does not fire', () => {
    const cb = vi.fn();
    const unsub = initGarbageCollectionObservation(cb);
    unsub();

    const state = observe(data, vi.fn());
    unobserve(state);

    expect(cb).not.toHaveBeenCalled();
  });
});
