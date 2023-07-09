import { configure, createObserver, observe, unwrap } from "#src";

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
    const store = createObserver(data, () => {});

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

  test("Unwrapping root object does not observe values", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);
    unwrap(store);
    configure(store, { select: false });

    store.value1 = "new-value1";

    expect(store.value1).toBe("new-value1");
    expect(unwrap(store)).toBe(data);

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Unwrapped primitive values are equal", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener1);
    observe(store.value1);
    observe(store.object1.value1);
    observe(store.array1[0].value1);
    configure(store, { select: false });

    store.value1 = "new-value1";
    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(unwrap(store.value1)).toBe("new-value1");
    expect(unwrap(store.object1.value1)).toBe("new-object1-value1");
    expect(unwrap(store.array1[0].value1)).toBe("new-array1-0-value1");

    expect(mockListener1).toHaveBeenCalledTimes(3);
  });

  test("Unwrapping intermediate values does not create an observation", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener1);
    unwrap(store.object1);
    unwrap(store.array1);
    configure(store, { select: false });

    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(store.object1.value1).toBe("new-object1-value1");
    expect(store.array1[0].value1).toBe("new-array1-0-value1");

    expect(mockListener1).toHaveBeenCalledTimes(0);
  });
});
