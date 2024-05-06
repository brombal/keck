import { deep, focus, observe, unwrap } from "#keck";

import { createData } from "../shared-data";

describe("Arrays", () => {
  test("Modifying array triggers callback and modifies store & source", () => {
    const mockCallback = jest.fn();
    const data = createData();

    const store = observe(data, mockCallback);

    // Expect equality of observable references
    expect(store.array1).toBe(store.array1);

    const array1 = store.array1;

    const newArray1 = { value1: "new-value1", value2: "new-value2" };
    store.array1[1] = newArray1;
    expect(store.array1).not.toBe(array1);
    expect(store.array1[1].value1).toBe("new-value1");
    expect(unwrap(store.array1[1])).toBe(newArray1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    const newArray1_3 = { value1: "array1-2-value1", value2: "array1-2-value2" };
    store.array1.push(newArray1_3);
    expect(unwrap(store.array1[3])).toBe(newArray1_3);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store.array2.splice(1, 1);
    expect(mockCallback).toHaveBeenCalledTimes(1);

    expect(store.array2[0].value1).toBe("array2-0-value1");
    expect(store.array2[1].value1).toBe("array2-2-value1");
    expect(store.array2[3]).toBeUndefined();

    expect(store.array2).toEqual([
      { value1: "array2-0-value1", value2: "array2-0-value2" },
      { value1: "array2-2-value1", value2: "array2-2-value2" },
    ]);
    expect(unwrap(store.array2)).toEqual([
      { value1: "array2-0-value1", value2: "array2-0-value2" },
      { value1: "array2-2-value1", value2: "array2-2-value2" },
    ]);
  });

  test("Push to array triggers callback", () => {
    const mockCallback = jest.fn();

    const data = createData();

    const store = observe(data, mockCallback);
    focus(store);
    deep(store.array1);
    focus(store, false);

    store.array1.push({ value1: "Movie 3", value2: "test" });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  // This test is necessary because pushing to an array automatically changes the length property; by the time
  // the setter is invoked, the length is already changed and the callback is not triggered due to the identical value being set.
  // There is a special case to handle this in the array observer implementation.
  test("Push to array when observing length triggers callback", () => {
    const mockCallback = jest.fn();

    const data = createData();

    const store = observe(data, mockCallback);
    focus(store);

    void store.array1.length;
    focus(store, false);

    store.array1.push({ value1: "Movie 3", value2: "test" });

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Splicing an array triggers callbacks", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();

    const data = createData();

    const store1 = observe(data, mockFn1);
    const store2 = observe(data, mockFn2);

    // Observe store1
    focus(store1);
    deep(store1.array1);
    deep(store1.array1[1]);
    void store1.array1[1].value1;
    focus(store1, false);

    // Observe store2 (differently from store1, to ensure callbacks are being triggered correctly)
    focus(store2);
    deep(store2.array1[1]);
    void store2.array1[1].value1;
    focus(store2, false);

    store1.array1.splice(1, 1);

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);

    expect(store1.array1[0].value1).toBe("array1-0-value1");
    expect(store1.array1[1].value1).toBe("array1-2-value1");
    expect(store1.array1[2]).toBeUndefined();
    expect(store2.array1[0].value1).toBe("array1-0-value1");
    expect(store2.array1[1].value1).toBe("array1-2-value1");
    expect(store2.array1[2]).toBeUndefined();
  });

  test("Splicing an array and then modifying values triggers callbacks", () => {
    const mockFn1 = jest.fn();
    const mockFn2 = jest.fn();

    const data = createData();

    const store1 = observe(data, mockFn1);
    const store2 = observe(data, mockFn2);

    focus(store1);
    void store1.array1[1].value1;
    focus(store1, false);

    focus(store2);
    deep(store2.array1[1]);
    focus(store2, false);

    store1.array1.splice(1, 1);
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    store2.array1[1].value1 = "new-array1-1-value1";
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);

    // Check values
    expect(store1.array1[0].value1).toBe("array1-0-value1");
    expect(store1.array1[1].value1).toBe("new-array1-1-value1");
    expect(store1.array1[2]).toBeUndefined();
    expect(store2.array1[0].value1).toBe("array1-0-value1");
    expect(store2.array1[1].value1).toBe("new-array1-1-value1");
    expect(store2.array1[2]).toBeUndefined();
  });
});
