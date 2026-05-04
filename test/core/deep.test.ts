import { deep, focus, observe } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

describe('deep()', () => {
  test('Modifying descendant property of deep observed object triggers callback', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);
    deep(store1.object1);
    deep(store1.object2);
    commit1();

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);
    deep(store2.object1);
    commit2();

    store1.object1.value1 = 'new-object1-value1';
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store1.object2.value1 = 'new-object2-value1';
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test('Replacing deep observed object triggers callback', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);
    deep(store1.object1);
    deep(store1.object2);
    commit1();

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);
    deep(store2.object1);
    commit2();

    const newObject1 = { value1: 'new-object1-value1' } as any;
    store1.object1 = newObject1;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store1.object2 = 'new-object2-value1' as any;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test('Replacing ancestor of deep observed object triggers callback', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);
    deep(store1.object1.value5);
    deep(store1.object2.value3);
    commit1();

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);
    deep(store2.object1.value5);
    commit2();

    const newObject1 = { value1: 'new-object-value1' } as any;
    store1.object1 = newObject1;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    const newObject2 = 'new-object-value1' as any;
    store1.object2.value3 = newObject2;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test('deep() on primitive does not throw error', () => {
    expect(deep(null)).toBe(null);
    expect(deep(undefined)).toBe(undefined);
    expect(deep(0)).toBe(0);
    expect(deep(false)).toBe(false);
    expect(deep('asdf')).toBe('asdf');
    const date = new Date();
    expect(deep(date)).toBe(date);
    const r = /asdf/;
    expect(deep(r)).toBe(r);
  });

  test('deep() on non-proxy observable throws error', () => {
    expect(() => deep({})).toThrow();
    expect(() => deep([])).toThrow();
    expect(() => deep(new Set())).toThrow();
  });
});
