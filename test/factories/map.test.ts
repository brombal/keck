import { deep, focus, observe } from 'keck';
import { vi } from 'vitest';

const createData = () => {
  const alphaMapValues: [string, string][] = [
    ['a', 'a'],
    ['b', 'b'],
    ['c', 'c'],
  ];
  const objectMapValues: [{ x: number }, { y: number }][] = [
    [{ x: 1 }, { y: 1 }],
    [{ x: 2 }, { y: 2 }],
    [{ x: 3 }, { y: 3 }],
  ];
  const numberMapValues: [number, string][] = [
    [1, 'a'],
    [2, 'b'],
    [3, 'c'],
  ];

  return {
    data: {
      alphaMap: new Map(alphaMapValues),
      objectMap: new Map(objectMapValues),
      inner: {
        numberMap: new Map(numberMapValues),
      },
    },
    alphaMapValues,
    objectMapValues,
    numberMapValues,
  };
};

describe('Maps', () => {
  test('Modifying map takes effect and triggers callback', () => {
    const { data } = createData();

    const mockCallback = vi.fn();
    const store = observe(data, mockCallback);

    // Modify map & check values
    store.alphaMap.set('d', 'd');

    // Only called once even though value and map size changed
    expect(mockCallback).toHaveBeenCalledTimes(1);

    expect(store.alphaMap.size).toBe(4);
    expect(store.alphaMap.get('d')).toBe('d');
    expect(data.alphaMap.size).toBe(4);
    expect(data.alphaMap.get('d')).toBe('d');
  });

  test('Modifying Map after deep observing it triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    deep(store.alphaMap);
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map after observing size triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void store.alphaMap.size;
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.delete('a');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.delete('a');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map after calling get() triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    store.alphaMap.get('d');
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Modifying Map after calling get() for unrelated key does not trigger callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    store.alphaMap.get('a');
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Modifying Map after calling has() triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    store.alphaMap.has('d');
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Modifying Map after calling has() for unrelated key does not trigger callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    store.alphaMap.has('a');
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Adding existing values or deleting non-existent values from Map does not trigger callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    deep(store.alphaMap);
    commit();

    store.alphaMap.set('a', 'a');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Clearing empty Map does not trigger callback', () => {
    const mockCallback = vi.fn();
    const store = observe(
      { emptyMap: new Map(), emptySet: new Set() },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(store);
    deep(store.emptyMap);
    deep(store.emptySet);
    commit();

    store.emptyMap.clear();
    store.emptySet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Modifying Map size after calling forEach() triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    store.alphaMap.forEach((_value) => {});
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map size after calling keys() triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void [...store.alphaMap.keys()];
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map size after calling values() triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void [...store.alphaMap.values()];
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map size after calling entries() triggers callback', () => {
    const mockCallback = vi.fn();
    const { data } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void [...store.alphaMap.entries()];
    commit();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.set('d', 'd');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store.alphaMap.delete('d');
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store.alphaMap.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map inner value triggers callback (non-focused)', () => {
    const mockCallback = vi.fn();
    const { data, objectMapValues } = createData();
    const store = observe(data, mockCallback);

    // Collect the observables; this is just a mechanism to test setting values on the inner observables
    const value = store.objectMap.get(objectMapValues[0][0])!;
    value.y = 123;

    expect(objectMapValues[0][1].y).toBe(123);
    expect(store.objectMap.get(objectMapValues[0][0])!.y).toBe(123);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Modifying Map inner value triggers callback (focused)', () => {
    const mockCallback = vi.fn();
    const { data, objectMapValues } = createData();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);
    void (store.objectMap.get(objectMapValues[0][0]) as any).y;
    commit();

    const value = store.objectMap.get(objectMapValues[0][0])!;
    value.y = 123;

    expect(objectMapValues[0][1].y).toBe(123);
    expect(store.objectMap.get(objectMapValues[0][0])!.y).toBe(123);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Object references are changed when modifying map inner value', () => {
    const mockCallback = vi.fn();
    const { data, objectMapValues } = createData();
    const store = observe(data, mockCallback);

    const originalObjectMap = store.objectMap;

    // Map should still be equal to original
    expect(store.objectMap).toBe(originalObjectMap);
    expect(store.objectMap.get(objectMapValues[0][0])).toBe(
      originalObjectMap.get(objectMapValues[0][0]),
    );
    expect(store.objectMap.get(objectMapValues[1][0])).toBe(
      originalObjectMap.get(objectMapValues[1][0]),
    );
    expect(store.objectMap.get(objectMapValues[2][0])).toBe(
      originalObjectMap.get(objectMapValues[2][0]),
    );
    expect(store.objectMap.get({ 'some-unknown-value': true } as any)).toBeUndefined();

    // Modify map value & check equality to map and inner values
    store.objectMap.set(objectMapValues[0][0], { y: 123 });

    // Map and modified key should now be different reference
    expect(store.objectMap).not.toBe(originalObjectMap);
    expect(store.objectMap.get(objectMapValues[0][0])).not.toBe(objectMapValues[0][1]);

    // Other keys should still be the same reference
    expect(store.objectMap.get(objectMapValues[1][0])).toBe(
      originalObjectMap.get(objectMapValues[1][0]),
    );
    expect(store.objectMap.get(objectMapValues[2][0])).toBe(
      originalObjectMap.get(objectMapValues[2][0]),
    );
  });
});
