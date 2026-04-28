import { jest } from '@jest/globals';
import { focus, initGarbageCollectionObservation, observe } from 'keck';
import { createData } from './shared-data';

const data = createData();

// Persistent observer ensures that garbage collection is still triggered if multiple observers exist
(window as any).observer = observe(data);

describe('Garbage collection', () => {
  /**
   * Test utility for garbage collection.
   * This will run the given callback, which should create and return an observable that invokes the given observeCb when modified.
   * After the observable goes out of scope, garbage collection is triggered, and this will test that the FinalizationRegistry callback is invoked
   * and that observeCb is not called after garbage collection.
   */
  async function sharedGcTest(cb: (observeCb: () => void) => any, afterGcCb?: () => void) {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = jest.fn();
    const r = new FinalizationRegistry(mockCleanupFn);

    const mockCallback = jest.fn();

    (() => {
      const store = cb(mockCallback);
      r.register(store, 'value1');
    })();

    jest.clearAllMocks();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);

    afterGcCb?.();

    expect(mockCallback).toHaveBeenCalledTimes(0);
  }

  test('Smoke test for WeakRef', async () => {
    let ref: WeakRef<any>;

    const mockCleanupFn = jest.fn();
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

  test('Garbage is collected when observable goes out of scope (unfocused; no modifications)', async () => {
    const mockCb = jest.fn();
    const state = observe(data, mockCb);

    await sharedGcTest(
      (cb) => {
        // This observable should be garbage collected; cb will not be called
        return observe(data, cb);
      },
      () => {
        state.value1 = 'new-value1';
        expect(mockCb).toHaveBeenCalledTimes(1);
      },
    );
  });

  test('Garbage is collected when observable goes out of scope (unfocused; property modified)', async () => {
    await sharedGcTest((cb) => {
      const state = observe(data, cb);
      state.value1 = 'value1-new';
      return state;
    });
  });

  test('Garbage is collected when observable goes out of scope (focused; no observations; no modifications)', async () => {
    await sharedGcTest((cb) => {
      const state = observe(data, cb);
      focus(state);
      return state;
    });
  });

  test('Garbage is collected when observable goes out of scope (focused; no observations; property modified)', async () => {
    await sharedGcTest((cb) => {
      const state = observe(data, cb);
      focus(state);
      state.value1 = 'value1-new';
      return state;
    });
  });

  test('Garbage is collected when observable goes out of scope (focused; property observed; no modifications)', async () => {
    await sharedGcTest((cb) => {
      const state = observe(data, cb);
      focus(state);
      void state.value1;
      return state;
    });
  });

  test('Garbage is collected when observable goes out of scope (focused; property observed; property modified)', async () => {
    await sharedGcTest((cb) => {
      const state = observe(data, cb);
      focus(state);
      void state.value1;
      state.value1 = 'value1-new';
      return state;
    });
  });
});

describe('initGarbageCollectionObservation', () => {
  const unsubs: Array<() => void> = [];
  afterEach(() => {
    unsubs.splice(0).forEach((u) => void u());
  });

  test('callback fires when observe() result is garbage collected', async () => {
    const gcCallback = jest.fn();
    unsubs.push(initGarbageCollectionObservation(gcCallback));

    (() => {
      observe(data, jest.fn());
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(gcCallback).toHaveBeenCalledWith('Keck observable released');
  });

  test('multiple callbacks all fire', async () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    unsubs.push(initGarbageCollectionObservation(cb1));
    unsubs.push(initGarbageCollectionObservation(cb2));

    (() => {
      observe(data, jest.fn());
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cb1).toHaveBeenCalledWith('Keck observable released');
    expect(cb2).toHaveBeenCalledWith('Keck observable released');
  });

  test('unsubscribed callback does not fire', async () => {
    const cb = jest.fn();
    const unsub = initGarbageCollectionObservation(cb);
    unsub();

    (() => {
      observe(data, jest.fn());
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cb).not.toHaveBeenCalled();
  });
});
