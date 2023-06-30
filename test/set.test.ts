import { configure, createObserver, unwrap } from "#src";

function noop() {}

const createData = () => {
  const alphaSetValues = ["a", "b", "c"];
  const objectSetValues = [{ x: 1 }, { x: 2 }, { x: 3 }];
  const numberSetValues = [1, 2, 3];

  return {
    data: {
      alphaSet: new Set<any>(alphaSetValues),
      objectSet: new Set<any>(objectSetValues),
      inner: {
        numberSet: new Set<any>(numberSetValues),
      },
    },
    alphaSetValues,
    objectSetValues,
    numberSetValues,
  };
};

describe("Sets", () => {
  test("Set is modified", () => {
    const { data } = createData();
    const store = createObserver(data, noop);

    // Modify set & check values
    store.alphaSet.add("d");

    expect(store.alphaSet.size).toBe(4);
    expect(store.alphaSet.has("d")).toBe(true);
    expect(data.alphaSet.size).toBe(4);
    expect(data.alphaSet.has("d")).toBe(true);
  });

  test("Callback is triggered when modifying set after observing size", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    void store.alphaSet.size;

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(0); // Not called again for adding same value
    mockListener.mockClear();

    store.alphaSet.delete("a");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.delete("a");
    expect(mockListener).toHaveBeenCalledTimes(0); // Not called again for deleting same value
    mockListener.mockClear();

    store.alphaSet.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set after unwrapping set", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    unwrap(store.alphaSet);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set after calling has()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    store.alphaSet.has("a");
    configure(store, { select: false });

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is not triggered when adding existing values or deleting non-existent values", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    unwrap(store.alphaSet);

    // Modify set & check callback counts
    store.alphaSet.add("a");
    expect(mockListener).toHaveBeenCalledTimes(0);
    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is not triggered when clearing empty set", () => {
    const mockListener = jest.fn();
    const store = createObserver({ emptySet: new Set() }, mockListener);

    unwrap(store.emptySet);

    // Modify set & check callback counts
    store.emptySet.clear();
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callback is triggered only when modifying set size after calling forEach()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    store.alphaSet.forEach((value) => {});

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered only when modifying set size after calling keys()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    void [...store.alphaSet.keys()]; // keys() only returns an iterable so we need to spread it to trigger the callback

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered only when modifying set size after calling values()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    void [...store.alphaSet.values()];

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered only when modifying set size after calling entries()", () => {
    const mockListener = jest.fn();
    const { data } = createData();
    const store = createObserver(data, mockListener);

    void [...store.alphaSet.entries()];

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.add("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    store.alphaSet.delete("d");
    expect(mockListener).toHaveBeenCalledTimes(0);
    mockListener.mockClear();

    store.alphaSet.clear();
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set inner value", () => {
    const mockListener = jest.fn();
    const { data, objectSetValues } = createData();
    const store = createObserver(data, mockListener);

    // Collect the observables; this is just a mechanism to test setting values on the inner observables
    const values: any[] = [];
    store.objectSet.forEach((value) => {
      void value.x;
      values.push(value);
    });

    values[0].x = 123;

    expect(objectSetValues[0].x).toBe(123);
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Callback is triggered when modifying set inner value after unwrapping", () => {
    const mockListener = jest.fn();
    const { data, objectSetValues } = createData();
    const store = createObserver(data, mockListener);

    const values: any[] = [];
    unwrap(store.objectSet);

    store.objectSet.forEach((value) => {
      values.push(value);
    });

    values[0].x = 123;

    expect(objectSetValues[0].x).toBe(123);
    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener.mock.calls[0][1]).toBe("x");
  });

  test("Object references are changed when modifying set inner value", () => {
    const mockListener = jest.fn();
    const { data, objectSetValues } = createData();
    const store = createObserver(data, mockListener);
    configure(store, { clone: true });

    const originalObjectSet = store.objectSet;

    const observables = [...store.objectSet];

    // Set should still be equal to original
    expect(store.objectSet).toBe(originalObjectSet);
    expect(data.objectSet.has(objectSetValues[0])).toBe(true);
    expect(store.objectSet.has(objectSetValues[0])).toBe(true);
    expect(store.objectSet.has(objectSetValues[1])).toBe(true);
    expect(store.objectSet.has(objectSetValues[2])).toBe(true);
    expect(store.objectSet.has({ "some-unknown-value": true })).toBe(false);

    // Modify set value & check equality to set and inner values
    observables[0].x = 123;

    // Set should now be different reference
    expect(store.objectSet).not.toBe(originalObjectSet);
    expect(store.objectSet.has(objectSetValues[0])).toBe(false);
    expect(store.objectSet.has(objectSetValues[1])).toBe(true);
    expect(store.objectSet.has(objectSetValues[2])).toBe(true);
  });
});
