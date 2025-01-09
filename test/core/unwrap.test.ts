import { jest } from '@jest/globals';
import { focus, observe, unwrap } from 'keck';
import { createData } from '../shared-data';

describe('unwrap()', () => {
  test('References/values are equal when value is unwrapped', () => {
    const data = createData();
    const store1 = observe(data, () => {});
    const store2 = observe(data, () => {});

    expect(unwrap(store1)).toBe(data);
    expect(unwrap(store1.object1)).toBe(data.object1);
    expect(unwrap(store1.array1)).toBe(data.array1);
    expect(unwrap(store1.array1[0])).toBe(data.array1[0]);

    store1.value1 = 'new-value1';
    store1.object1.value1 = 'new-object1-value1';
    store1.array1[0].value1 = 'new-array1-0-value1';

    expect(unwrap(store1)).toBe(data);
    expect(unwrap(store1.object1)).toBe(data.object1);
    expect(unwrap(store1.array1)).toBe(data.array1);
    expect(unwrap(store1.array1[0])).toBe(data.array1[0]);

    expect(unwrap(store2)).toBe(data);
  });

  test('Unwrapping does not create observation', () => {
    const data = createData();
    const mockCallback = jest.fn();
    const store1 = observe(data, mockCallback);
    focus(store1);

    unwrap(store1);

    store1.object1.value1 = 'new-object1-value1';

    expect(mockCallback).not.toHaveBeenCalled();
  });

  test('Unwrapping with deep observation works', () => {
    const data = createData();
    const mockCallback = jest.fn();
    const store1 = observe(data, mockCallback);
    focus(store1);

    unwrap(store1, true);

    store1.object1.value1 = 'new-object1-value1';

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
