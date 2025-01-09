import { jest } from '@jest/globals';
import { focus, observe } from 'keck';

import { createData } from '../shared-data';

describe('object', () => {
  test('Modification after accessing with Object.entries triggers callback', () => {
    const data = createData();
    const mockCallback = jest.fn();
    const store = observe(data, mockCallback);
    focus(store);

    Object.entries(store.object1);
    focus(store, false);

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.object2.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });

  test('Modification after accessing with Object.keys triggers callback', () => {
    const data = createData();
    const mockCallback = jest.fn();
    const store = observe(data, mockCallback);
    focus(store);

    Object.keys(store.object1);
    focus(store, false);

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.object2.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });

  test('Modification after accessing with Object.values triggers callback', () => {
    const data = createData();
    const mockCallback = jest.fn();
    const store = observe(data, mockCallback);
    focus(store);

    Object.values(store.object1);
    focus(store, false);

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.object2.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });

  test('Modification after accessing with for loop triggers callback', () => {
    const data = createData();
    const mockCallback = jest.fn();
    const store = observe(data, mockCallback);
    focus(store);

    for (const key in store.object1) {
      void key;
    }
    focus(store, false);

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.object2.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });
});
