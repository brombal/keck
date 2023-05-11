import { observe, unwrap } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  object1: { value1: "object1-value1", value2: "object1-value2" },
  object2: { value1: "object2-value1", value2: "object2-value2" },
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
  ],
});

describe("Multiple stores", () => {
  // Modifying primitive values in a store should update values in all other stores and trigger callbacks in other stores
  test("Modifying values in a store should update values in all other stores", () => {
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();

    const data = createData();

    const [store1, { stop: unobserve1 }] = observe(data, mockListener1);
    const [store2, { stop: unobserve2 }] = observe(data, mockListener2);

    const store1_object1 = store1.object1;
    const store1_object2 = store1.object2;
    const store1_array1 = store1.array1;
    const store1_array1_0 = store1.array1[0];
    const store1_array1_1 = store1.array1[1];

    const store2_object1 = store2.object1;
    const store2_object2 = store2.object2;
    const store2_array1 = store2.array1;
    const store2_array1_0 = store2.array1[0];
    const store2_array1_1 = store2.array1[1];

    store1.value1 = "new-value1";
    store2.object1.value1 = "new-object1-value1";
    store1.array1[0].value1 = "new-array1-0-value1";
    store2.array1[1] = { value1: "new-array1-1-value1", value2: "new-array1-1-value2" };

    expect(store1.value1).toBe("new-value1");
    expect(store1.object1.value1).toBe("new-object1-value1");
    expect(store1.array1[0].value1).toBe("new-array1-0-value1");
    expect(store1.array1[1].value1).toBe("new-array1-1-value1");

    expect(store2.value1).toBe("new-value1");
    expect(store2.object1.value1).toBe("new-object1-value1");
    expect(store2.array1[0].value1).toBe("new-array1-0-value1");
    expect(store2.array1[1].value1).toBe("new-array1-1-value1");

    expect(store1_object1).not.toBe(store1.object1);
    expect(store1_object2).toBe(store1.object2);
    expect(store1_array1).not.toBe(store1.array1);
    expect(store1_array1_0).not.toBe(store1.array1[0]);
    expect(store1_array1_1).not.toBe(store1.array1[1]);

    expect(store2_object1).not.toBe(store2.object1);
    expect(store2_object2).toBe(store2.object2);
    expect(store2_array1).not.toBe(store2.array1);
    expect(store2_array1_0).not.toBe(store2.array1[0]);
    expect(store2_array1_1).not.toBe(store2.array1[1]);
  });

  // Modifying primitive values in a store should trigger callbacks in all (and only) observing stores
  test("Modifying primitive values in a store should trigger callbacks in all (and only) observing stores", () => {
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();

    const data = createData();

    const [store1, { stop: unobserve1 }] = observe(data, mockListener1);
    const [store2, { stop: unobserve2 }] = observe(data, mockListener2);

    void store1.value1;
    void store1.object1.value1;
    unwrap(store1.array1[0]);
    unobserve1();

    void store2.value1;
    unwrap(store2.array1[0]);
    unobserve2();

    store1.value1 = "new-value2";
    store2.object1.value1 = "new-object1-value2";
    store1.array1[0].value1 = "new-array1-0-value2";

    expect(mockListener1).toHaveBeenCalledTimes(3);
    expect(mockListener2).toHaveBeenCalledTimes(2);
  });

  test("Creating an observer from another observable should work", () => {
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();

    const data = createData();

    const [store1] = observe(data, mockListener1);
    const [store2] = observe(store1.object1, mockListener2);

    void store1.object1.value1;

    store1.object1.value1 = "new-object1-value1-1";
    store2.value1 = "new-object1-value1-2";

    expect(mockListener1).toHaveBeenCalledTimes(2);
  });
});
