import { createObserver, unwrap } from "#src";

function noop() {}

const createData = () => {
  const alphaMapValues: [string, string][] = [
    ["a", "a"],
    ["b", "b"],
    ["c", "c"],
  ];
  const objectMapValues: [{ x: number }, { y: number }][] = [
    [{ x: 1 }, { y: 1 }],
    [{ x: 2 }, { y: 2 }],
    [{ x: 3 }, { y: 3 }],
  ];
  const numberMapValues: [number, string][] = [
    [1, "a"],
    [2, "b"],
    [3, "c"],
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

describe("Maps", () => {
  test("Map is modified", () => {
    const { data } = createData();
    const { store } = createObserver(data, noop);

    // Modify set & check values
    store.alphaMap.set("d", "d");

    expect(store.alphaMap.size).toBe(4);
    expect(store.alphaMap.get("d")).toBe("d");
    expect(data.alphaMap.size).toBe(4);
    expect(data.alphaMap.get("d")).toBe("d");
  });

  test("Callback is triggered when modifying set after observing size", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store } = createObserver(data, mockListener);

    void store.alphaMap.size;

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0); // Not called again for adding same value
    mockListener.mockClear();

    store.alphaMap.delete("a");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.delete("a");
    expect(mockListener).toHaveBeenCalledTimes(0); // Not called again for deleting same value
    mockListener.mockClear();

    store.alphaMap.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set after unwrapping set", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store } = createObserver(data, mockListener);

    unwrap(store.alphaMap);

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(2); // Modified size & added value
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(2); // Modified size & deleted value
    mockListener.mockClear();

    store.alphaMap.clear();
    expect(mockListener).toHaveBeenCalledTimes(1); // Modified size
  });

  test("Callback is triggered when modifying set after calling get()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    store.alphaMap.get("d");
    unobserve();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is not triggered when modifying set after calling get() for unrelated value", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    store.alphaMap.get("a");
    unobserve();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is triggered when modifying set after calling has()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    store.alphaMap.has("d");
    unobserve();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is not triggered when modifying set after calling has() for unrelated value", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    store.alphaMap.has("a");
    unobserve();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is not triggered when adding existing values or deleting non-existent values", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    unwrap(store.alphaMap);

    store.alphaMap.set("a", "a");
    expect(mockListener).toHaveBeenCalledTimes(0);
    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is not triggered when clearing empty set", () => {
    const mockListener = jest.fn();
    const { store, unobserve } = createObserver({ emptySet: new Set() }, mockListener);

    unwrap(store.emptySet);

    store.emptySet.clear();
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is triggered only when modifying set size after calling forEach()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    store.alphaMap.forEach((value) => {});

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered only when modifying set size after calling keys()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    void [...store.alphaMap.keys()]; // keys() only returns an iterable so we need to spread it to trigger the callback

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered only when modifying set size after calling values()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    void [...store.alphaMap.values()];

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered only when modifying set size after calling entries()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    void [...store.alphaMap.entries()];

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.set("d", "d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaMap.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaMap.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set inner value", () => {
    const mockListener = jest.fn();
    const { data, objectMapValues } = createData();
    const { store, unobserve } = createObserver(data, mockListener);

    // Collect the observables; this is just a mechanism to test setting values on the inner observables
    const values: { y: number }[] = [];
    store.objectMap.forEach((value) => {
      void value.y;
      values.push(value);
    });

    values[0].y = 123;

    expect(objectMapValues[0][1].y).toBe(123);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set inner value after unwrapping", () => {
    const mockListener = jest.fn();
    const { data, objectMapValues } = createData();
    const { store } = createObserver(data, mockListener);

    const values: { y: number }[] = [];
    unwrap(store.objectMap);

    store.objectMap.forEach((value) => {
      values.push(value);
    });

    values[0].y = 123;

    expect(objectMapValues[0][1].y).toBe(123);
    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener.mock.calls[0][1]).toBe("objectMap");
  });

  test("Object references are changed when modifying set inner value", () => {
    const mockListener = jest.fn();
    const { data, objectMapValues } = createData();
    const { store } = createObserver(data, mockListener);

    const originalobjectMap = store.objectMap;

    const observables = [...store.objectMap];

    // Set should still be equal to original
    expect(store.objectMap).toBe(originalobjectMap);
    expect(data.objectMap.get(objectMapValues[0][0])).toBe(objectMapValues[0][1]);
    expect(store.objectMap.get(objectMapValues[0][0])).toBe(objectMapValues[0][1]);
    expect(store.objectMap.get(objectMapValues[1][0])).toBe(objectMapValues[1][1]);
    expect(store.objectMap.get(objectMapValues[2][0])).toBe(objectMapValues[2][1]);
    expect(store.objectMap.get({ "some-unknown-value": true } as any)).toBeUndefined();

    // Modify set value & check equality to set and inner values
    observables[0][1].y = 123;

    // Set should now be different reference
    expect(store.objectMap).not.toBe(originalobjectMap);
    expect(store.objectMap.get(objectMapValues[0][0])).not.toBe(objectMapValues[0][1]);
    expect(store.objectMap.get(objectMapValues[1][0])).toBe(objectMapValues[1][1]);
    expect(store.objectMap.get(objectMapValues[2][0])).toBe(objectMapValues[2][1]);
  });
});
