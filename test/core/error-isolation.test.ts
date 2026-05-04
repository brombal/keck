import { configure, observe, resetConfiguration } from 'keck';
import { afterEach, vi } from 'vitest';
import { createData } from '../shared-data';

afterEach(() => {
  resetConfiguration();
  vi.restoreAllMocks();
});

describe('error isolation — observer callbacks', () => {
  test('other observers still fire after one callback throws', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });

    const data = createData();
    const err = new Error('boom');

    const throwingFn = vi.fn(() => {
      throw err;
    });
    const normalFn = vi.fn();

    const store1 = observe(data, throwingFn);
    observe(data, normalFn);

    store1.value1 = 'changed';

    expect(throwingFn).toHaveBeenCalledTimes(1);
    expect(normalFn).toHaveBeenCalledTimes(1);
    expect(errors).toEqual([err]);
  });

  test('thrown error is routed to onError, not thrown synchronously', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });

    const data = createData();
    const err = new Error('boom');

    const store = observe(data, () => {
      throw err;
    });

    expect(() => {
      store.value1 = 'changed';
    }).not.toThrow();
    expect(errors).toEqual([err]);
  });

  test('without onError, error is rethrown asynchronously via setTimeout', () => {
    vi.useFakeTimers();
    const data = createData();
    const err = new Error('async rethrow');

    const store = observe(data, () => {
      throw err;
    });

    expect(() => {
      store.value1 = 'changed';
    }).not.toThrow();
    expect(() => {
      vi.runAllTimers();
    }).toThrow(err);
    vi.useRealTimers();
  });

  test('multiple throwing observers all route their errors to onError', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });

    const data = createData();
    const err1 = new Error('first');
    const err2 = new Error('second');

    const store1 = observe(data, () => {
      throw err1;
    });
    observe(data, () => {
      throw err2;
    });

    store1.value1 = 'changed';

    expect(errors).toContain(err1);
    expect(errors).toContain(err2);
  });
});

describe('error isolation — derive functions', () => {
  test('a throwing derive routes the error to onError', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });

    const data = createData();
    const err = new Error('derive boom');

    // Derive fn succeeds on first call (setup), throws on re-invocation
    let calls = 0;
    const store = observe(data, {
      derive: (s) => {
        calls++;
        if (calls > 1) throw err;
        return s.value1;
      },
      onChange: vi.fn(),
    });

    expect(() => {
      store.value1 = 'changed';
    }).not.toThrow();
    expect(errors).toEqual([err]);
  });

  test('a throwing derive still triggers the observer (treated as changed)', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });

    const data = createData();
    const callbackFn = vi.fn();

    let calls = 0;
    const store = observe(data, {
      derive: (s) => {
        calls++;
        if (calls > 1) throw new Error('derive boom');
        return s.value1;
      },
      onChange: callbackFn,
    });

    store.value1 = 'changed';

    expect(callbackFn).toHaveBeenCalledTimes(1);
  });

  test('a throwing derive does not prevent other observers from being notified', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });

    const data = createData();
    const normalFn = vi.fn();

    let calls = 0;
    const store = observe(data, {
      derive: (s) => {
        calls++;
        if (calls > 1) throw new Error('derive boom');
        return s.value1;
      },
      onChange: vi.fn(),
    });

    observe(data, normalFn);

    store.value1 = 'changed';

    expect(normalFn).toHaveBeenCalledTimes(1);
  });
});

describe('resetConfiguration()', () => {
  test('restores default behavior after configure()', () => {
    const errors: unknown[] = [];
    configure({ onError: (e) => errors.push(e) });
    resetConfiguration();

    vi.useFakeTimers();
    const data = createData();
    const err = new Error('after reset');

    const store = observe(data, () => {
      throw err;
    });
    store.value1 = 'changed';

    expect(errors).toHaveLength(0);
    expect(() => {
      vi.runAllTimers();
    }).toThrow(err);
    vi.useRealTimers();
  });
});
