import { jest } from '@jest/globals';
import { deep, derive, focus, observe, reset, shallowCompare } from 'keck';
import { createData } from '../shared-data';

describe('reset()', () => {
  test('After resetting observer, modifying values will not trigger any callbacks', () => {
    const mockCallback = jest.fn();

    const data = createData();

    const store = observe(data, mockCallback);
    focus(store);

    void store.value1;
    void store.object1.value1;
    deep(store.object2);

    reset(store);

    // No modifications should trigger callback

    store.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    store.value2 = 1;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    store.object1.value1 = 'new-object1-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    store.object1.value2 = 'new-object1-value2';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    store.object2 = {} as any;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();
  });

  test('Resetting observer with derived values multiple times should trigger derive method and callback consistently', () => {
    const mockCallback = jest.fn();
    const mockDerive = jest.fn();

    const data = createData();

    const store = observe(data, mockCallback);
    focus(store);

    for (let i = 1; i <= 3; i++) {
      derive(() => {
        mockDerive();
        return [store.value1, store.value2];
      }, shallowCompare);

      jest.resetAllMocks();

      store.value1 = `new-value1-${i}`;
      expect(mockDerive).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      jest.resetAllMocks();

      store.value2 = i;
      expect(mockDerive).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledTimes(1);
      jest.resetAllMocks();

      reset(store);
    }
  });

  test('Calling reset() when not in focus mode causes error', () => {
    const mockCallback = jest.fn();

    const store = observe({}, mockCallback);

    expect(() => reset(store)).toThrow('reset() can only be called in focus mode');
  });

  test('Resetting clears observations and keeps focus mode enabled', () => {
    const mockCallback = jest.fn();

    const data = createData();

    const store = observe(data, mockCallback);
    focus(store);

    void store.value1;
    void store.object1.value1;
    deep(store.object2);

    reset(store);

    jest.resetAllMocks();

    store.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.object1.value1 = 'new-object1-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.object2 = {} as any;
    expect(mockCallback).toHaveBeenCalledTimes(0);

    void store.value1;

    store.value1 = 'new-value1-2';
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
