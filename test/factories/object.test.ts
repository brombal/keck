import { focus, observe } from 'keck';
import { vi } from 'vitest';

import { createData } from '../shared-data';

describe('object', () => {
  test('Modification after accessing with Object.entries triggers callback', () => {
    const data = createData();
    const mockCallback = vi.fn();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    Object.entries(store.object1);
    commit();

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.object2.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test('Modification to key length after accessing with Object.keys triggers callback', () => {
    const data = createData();
    const mockCallback = vi.fn();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    Object.keys(store.object1);
    commit();

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.object1.value3 = {} as any;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();
  });

  test('Modification after accessing with Object.values triggers callback', () => {
    const data = createData();
    const mockCallback = vi.fn();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    Object.values(store.object1);
    commit();

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.object2.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test('Modification after accessing with for loop triggers callback', () => {
    const data = createData();
    const mockCallback = vi.fn();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    for (const key in store.object1) {
      void key;
    }
    commit();

    store.object1.value1 = 'new-value1';
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    delete store.object1.value3;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.object1.value3 = {} as any;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();
  });

  test('Observing with Object.keys and then adding/deleting a property triggers callback', () => {
    const mockCallback = vi.fn();
    const store = observe(
      { object: {} as Record<string, any> },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(store);
    Object.keys(store.object);
    commit();

    store.object.newValue = 'added-value';
    delete store.object.newValue;
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });

  test('Deleting a non-configurable property does not trigger callback and throws TypeError', () => {
    const mockCallback = vi.fn();
    const obj: Record<string, any> = {};
    Object.defineProperty(obj, 'locked', { value: 42, configurable: false });
    const store = observe({ obj }, mockCallback);

    expect(() => {
      delete (store.obj as any).locked;
    }).toThrow(TypeError);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Observing with Object.entries and then adding/deleting a property triggers callback', () => {
    const mockCallback = vi.fn();
    const store = observe(
      { object: {} as Record<string, any> },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(store);
    Object.entries(store.object);
    commit();

    store.object.newValue = 'added-value';
    delete store.object.newValue;
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});
