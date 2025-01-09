import { deep, focus, observe } from "keck";
import { jest } from "@jest/globals";

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
    const store = observe(data, noop);

    // Modify set & check values
    store.alphaSet.add("d");

    expect(store.alphaSet.size).toBe(4);
    expect(store.alphaSet.has("d")).toBe(true);
    expect(data.alphaSet.size).toBe(4);
    expect(data.alphaSet.has("d")).toBe(true);
  });

  test("Modifying set after observing set triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);
    void store.alphaSet.size;
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(0); // Not called again for adding same value
    jest.clearAllMocks();

    store.alphaSet.delete("a");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.delete("a");
    expect(mockCallback).toHaveBeenCalledTimes(0); // Not called again for deleting same value
    jest.clearAllMocks();

    store.alphaSet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set after observing set triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);
    deep(store.alphaSet);
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set after calling has() triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    store.alphaSet.has("a");
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set after re-adding or deleting non-existent value does not trigger callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);
    deep(store.alphaSet);
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("a");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test("Clearing empty set does not trigger callback", () => {
    const mockCallback = jest.fn();
    const store = observe({ emptySet: new Set() }, mockCallback);
    focus(store);
    deep(store.emptySet);
    focus(store, false);

    // Modify set & check callback counts
    store.emptySet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test("Modifying set size after calling forEach() triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    store.alphaSet.forEach((value) => {});
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set size after calling keys() triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    void [...store.alphaSet.keys()]; // keys() only returns an iterable so we need to spread it to trigger the callback
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set size after calling values() triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    void [...store.alphaSet.values()];
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set size after calling entries() triggers callback", () => {
    const mockCallback = jest.fn();
    const { data } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    void [...store.alphaSet.entries()];
    focus(store, false);

    // Modify set & check callback counts
    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.add("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.alphaSet.delete("d");
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store.alphaSet.clear();
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set inner value triggers callback (non-focus)", () => {
    const mockCallback = jest.fn();
    const { data, objectSetValues } = createData();
    const store = observe(data, mockCallback);

    // Collect the observables; this is just a mechanism to get the inner observables
    // to test setting values on them
    const values: any[] = [];
    store.objectSet.forEach((value) => {
      void value.x;
      values.push(value);
    });

    values[0].x = 123;

    expect(objectSetValues[0].x).toBe(123);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying set inner value triggers callback (focus)", () => {
    const mockCallback = jest.fn();
    const { data, objectSetValues } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    const values: any[] = [];
    deep(store.objectSet);
    focus(store, false);

    store.objectSet.forEach((value) => {
      values.push(value);
    });

    values[0].x = 123;

    expect(objectSetValues[0].x).toBe(123);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Modifying Set inner value changes object references", () => {
    const mockCallback = jest.fn();
    const { data, objectSetValues } = createData();
    const store = observe(data, mockCallback);
    focus(store);

    const originalObjectSet = store.objectSet;

    // Set should still be equal to original
    expect(store.objectSet).toBe(originalObjectSet);

    // Modify set value & check equality to set and inner values
    const setValues = [...store.objectSet];
    setValues[0].x = 123;

    // Set and first value should now be different reference
    expect(store.objectSet).not.toBe(originalObjectSet);
    const newSetValues = [...store.objectSet];
    expect(newSetValues[0]).not.toBe(setValues[0]);
    expect(newSetValues[1]).toBe(setValues[1]);
    expect(newSetValues[2]).toBe(setValues[2]);
  });
});
