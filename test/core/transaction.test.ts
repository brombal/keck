import { jest } from '@jest/globals';
import { beginTransaction, commitTransaction, discardTransaction, observe } from 'keck';

describe('transaction', () => {
  test('commitTransaction without beginTransaction is a no-op', () => {
    const store = observe({ value: 1 }, jest.fn());
    expect(() => commitTransaction(store)).not.toThrow();
  });

  test('commitTransaction makes pending observations live', () => {
    const mockCallback = jest.fn();
    const store = observe({ value: 1 }, mockCallback);

    beginTransaction(store);
    void store.value; // read to create a pending observation
    commitTransaction(store);

    store.value = 2; // should trigger now that observation is committed
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('discardTransaction without beginTransaction is a no-op', () => {
    const store = observe({ value: 1 }, jest.fn());
    expect(() => discardTransaction(store)).not.toThrow();
  });
});
