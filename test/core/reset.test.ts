import { deep, derive, focus, observe, reset, shallowCompare } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

describe('reset()', () => {
  test('After resetting observer, modifying values will not trigger any callbacks', () => {
    const mockCallback = vi.fn();

    const data = createData();

    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void store.value1;
    void store.object1.value1;
    deep(store.object2);
    commit();

    reset(store);

    // No modifications should trigger callback

    store.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();

    store.value2 = 1;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();

    store.object1.value1 = 'new-object1-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();

    store.object1.value2 = 'new-object1-value2';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();

    store.object2 = {} as any;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();
  });

  test('Resetting observer with derived values multiple times should trigger derive method and callback consistently', () => {
    const mockCallback = vi.fn();
    const mockDerive = vi.fn();

    const data = createData();

    const store = observe(data, { focusable: true, onChange: mockCallback });

    for (let i = 1; i <= 3; i++) {
      const { commit } = focus(store);
      derive(() => {
        mockDerive();
        return [store.value1, store.value2];
      }, shallowCompare);
      commit();

      vi.resetAllMocks();

      store.value1 = `new-value1-${i}`;
      expect(mockDerive).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      vi.resetAllMocks();

      store.value2 = i;
      expect(mockDerive).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      vi.resetAllMocks();

      reset(store);
    }
  });

  test('Resetting clears observations; starting a new session re-enables them', () => {
    const mockCallback = vi.fn();

    const data = createData();

    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void store.value1;
    void store.object1.value1;
    deep(store.object2);
    commit();

    reset(store);

    vi.resetAllMocks();

    store.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.object1.value1 = 'new-object1-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.object2 = {} as any;
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Start a new session and observe value1
    const { commit: commit2 } = focus(store);
    void store.value1;
    commit2();

    store.value1 = 'new-value1-2';
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Calling reset() on non-observable throws', () => {
    expect(() => reset({})).toThrow('Value is not observable');
  });
});
