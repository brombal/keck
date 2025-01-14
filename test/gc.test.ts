import { jest } from '@jest/globals';
import { focus, observe } from 'keck';
import { createData } from './shared-data';

const data = createData();

describe('Garbage collection', () => {
  async function sharedGcTest(cb: (observeCb: () => void) => any, afterGcCb?: () => void) {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = jest.fn();
    const r = new FinalizationRegistry(mockCleanupFn);

    const mockCallback = jest.fn();

    (() => {
      const store = cb(mockCallback);
      r.register(store, 'value1');
    })();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    afterGcCb?.();

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
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
    await sharedGcTest(
      (cb) => {
        return observe(data, cb);
      },
      () => {
        observe(data);
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
