import { observe, unwrap } from "#keck";

import { createData } from "../shared-data";

describe("observe()", () => {
  test("Observable properties of the same parent are equal without modification", () => {
    const mockCallback = jest.fn();
    const data = createData();

    const store1 = observe(data, mockCallback);
    const store2 = observe(data, mockCallback);

    // Observables are not the same reference
    expect(store1).not.toBe(store2);

    // Properties are the same if not modified
    expect(store1.object1).toBe(store1.object1);
    expect(store1.object2).toBe(store1.object2);
    expect(store1.object1).not.toBe(store1.object2);

    // Properties of other observables are not the same
    expect(store1.object1).not.toBe(store2.object1);
    expect(store1.object2).not.toBe(store2.object2);
  });

  test("Observable references are different after modification", () => {
    const mockCallback = jest.fn();
    const data = createData();

    const store1 = observe(data, mockCallback);
    const store2 = observe(data, mockCallback);

    const store1_object1 = store1.object1;
    const store1_object2 = store1.object2;
    const store2_object1 = store2.object1;
    const store2_object2 = store2.object2;

    store1.object1.value1 = "new-value1";
    store1.object2 = {} as any;

    // Observables are not the same reference
    expect(store1.object1).not.toBe(store1_object1);
    expect(store1.object2).not.toBe(store1_object2);
    expect(store2.object1).not.toBe(store2_object1);
    expect(store2.object2).not.toBe(store2_object2);
  });

  test("Modifying primitive value triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);

    // Modify property
    store1.object1.value1 = "new-value1";
    expect(store1.object1.value1).toBe("new-value1");
    expect(store2.object1.value1).toBe("new-value1");
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    // No modification
    store1.object1.value1 = "new-value1";
    expect(store1.object1.value1).toBe("new-value1");
    expect(store2.object1.value1).toBe("new-value1");
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();

    // Delete property
    delete store1.object1.value3;
    expect("value3" in store1.object1).toBe(false);
    expect("value3" in store2.object1).toBe(false);
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test("Modifying object references triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);

    const newObject1 = { value1: "new-value1" } as any;
    store1.object1 = newObject1;

    expect(store1.object1).toEqual({ value1: "new-value1" });
    expect(store2.object1).toEqual({ value1: "new-value1" });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // No modification
    store1.object1 = newObject1;
    expect(store1.object1).toEqual({ value1: "new-value1" });
    expect(store2.object1).toEqual({ value1: "new-value1" });
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test("Swapping observable references triggers callback", () => {
    const data = createData();

    const revArray = [...data.array1];
    [revArray[0], revArray[1]] = [revArray[1], revArray[0]];

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);

    const a0 = store1.array1[0];
    const a1 = store1.array1[1];
    store1.array1[0] = a1;
    store1.array1[1] = a0;

    expect(mockFn1).toHaveBeenCalledTimes(2);
    expect(mockFn2).toHaveBeenCalledTimes(2);
    jest.clearAllMocks();

    expect(unwrap(store1.array1)).toBe(data.array1);
    expect(unwrap(store1.array1)).toEqual(revArray);
    expect(unwrap(store1.array1[0])).toEqual(revArray[0]);
    expect(unwrap(store1.array1[1])).toEqual(revArray[1]);
    expect(unwrap(store1.array1[0].value1)).toBe(revArray[0].value1);
    expect(unwrap(store1.array1[1].value1)).toBe(revArray[1].value1);

    expect(unwrap(store2.array1)).toBe(data.array1);
    expect(unwrap(store2.array1)).toEqual(revArray);
    expect(unwrap(store2.array1[0])).toEqual(revArray[0]);
    expect(unwrap(store2.array1[1])).toEqual(revArray[1]);
    expect(unwrap(store2.array1[0].value1)).toBe(revArray[0].value1);
    expect(unwrap(store2.array1[1].value1)).toBe(revArray[1].value1);

    expect(store1.array1).toEqual(revArray);
    expect(store1.array1[0]).toEqual(revArray[0]);
    expect(store1.array1[1]).toEqual(revArray[1]);
    expect(store1.array1[0].value1).toEqual(revArray[0].value1);
    expect(store1.array1[1].value1).toEqual(revArray[1].value1);

    expect(store2.array1).toEqual(revArray);
    expect(store2.array1[0]).toEqual(revArray[0]);
    expect(store2.array1[1]).toEqual(revArray[1]);
    expect(store2.array1[0].value1).toEqual(revArray[0].value1);
    expect(store2.array1[1].value1).toEqual(revArray[1].value1);
  });

  test("Creating an observable from another observable works", () => {
    const data = createData();
    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);

    const mockFn2 = jest.fn();
    const store2 = observe(store1, mockFn2);

    expect(store1).not.toBe(store2);

    // Basic test to ensure store2 works like an observable
    store2.object1.value1 = "new-value1";

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);

    expect(store1.object1.value1).toEqual("new-value1");
    expect(store2.object1.value1).toEqual("new-value1");
  });

  test("Creating an observable from a non-observable value errors", () => {
    expect(() => observe(1 as any, () => {})).toThrow(`Value 1 is not observable`);
    expect(() => observe("string" as any, () => {})).toThrow(`Value "string" is not observable`);
    expect(() => observe(null as any, () => {})).toThrow(`Value null is not observable`);
    expect(() => observe(undefined as any, () => {})).toThrow(`Value undefined is not observable`);
    expect(() => observe(new Date(), () => {})).toThrow(`Value of type Date is not observable`);
    expect(() =>
      observe(
        () => {},
        () => {},
      ),
    ).toThrow(`Value of type Function is not observable`);
  });

  test("JSON.stringify() on an observable should work", () => {
    const data = createData();
    const store1 = observe(data, () => {});

    expect(JSON.stringify(store1)).toBe(JSON.stringify(data));
  });
});
