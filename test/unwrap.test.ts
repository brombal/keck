import { createObserver, unwrap } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  object1: { value1: "object1-value1", value2: "object1-value2" },
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
  ],
});

describe("unwrap", () => {
  test("References/values are equal when value is unwrapped", () => {
    const data = createData();
    const { store } = createObserver(data, () => {});

    expect(unwrap(store)).toBe(data);
    expect(unwrap(store.object1)).toBe(data.object1);
    expect(unwrap(store.array1)).toBe(data.array1);
    expect(unwrap(store.array1[0])).toBe(data.array1[0]);

    store.value1 = "new-value1";
    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(unwrap(store)).toBe(data);
    expect(unwrap(store.object1)).toBe(data.object1);
    expect(unwrap(store.array1)).toBe(data.array1);
    expect(unwrap(store.array1[0])).toBe(data.array1[0]);
  });

  test("Unwrapping root object observes values", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store, unobserve: unobserve1 } = createObserver(data, mockListener);
    unwrap(store);
    unobserve1();

    store.value1 = "new-value1";

    expect(store.value1).toBe("new-value1");
    expect(unwrap(store)).toBe(data);

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Unwrapped primitive values are equal", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const { store, unobserve } = createObserver(data, mockListener1);
    unwrap(store.value1);
    unwrap(store.object1.value1);
    unwrap(store.array1[0].value1);
    unobserve();

    store.value1 = "new-value1";
    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(unwrap(store.value1)).toBe("new-value1");
    expect(unwrap(store.object1.value1)).toBe("new-object1-value1");
    expect(unwrap(store.array1[0].value1)).toBe("new-array1-0-value1");

    // Check that callback was called correctly
    expect(mockListener1).toHaveBeenCalledTimes(3);
  });

  test("Unwrapping intermediate values enables observation", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const { store, unobserve } = createObserver(data, mockListener1);
    unwrap(store.object1);
    unwrap(store.array1);
    unobserve();

    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(store.object1.value1).toBe("new-object1-value1");
    expect(store.array1[0].value1).toBe("new-array1-0-value1");

    // Check that callback was called correctly
    expect(mockListener1).toHaveBeenCalledTimes(2);
  });

  test("Unwrapping value without observing does not enable observation", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const { store, unobserve } = createObserver(data, mockListener1);
    unwrap(store.object1);
    unwrap(store.array1, false);
    unobserve();

    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(store.object1.value1).toBe("new-object1-value1");
    expect(store.array1[0].value1).toBe("new-array1-0-value1");

    // Check that callback was called correctly
    expect(mockListener1).toHaveBeenCalledTimes(1);
  });
});
