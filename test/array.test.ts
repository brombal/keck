import { configure, createObserver, derive, observe, unwrap } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
    { value1: "array1-2-value1", value2: "array1-2-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
    { value1: "array2-2-value1", value2: "array2-2-value2" },
  ],
});

describe("Arrays", () => {
  test("Writing properties triggers callback and modifies store & source", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);
    configure(store, { intermediates: true });
    void store.array1;
    void store.array2;
    configure(store, { select: false });

    store.array1.push({ value1: "array1-2-value1", value2: "array1-2-value2" });
    expect(mockListener).toHaveBeenCalledTimes(2);
    mockListener.mockClear();

    store.array2.splice(1, 1);
    expect(mockListener).toHaveBeenCalledTimes(3);

    expect(store.array2[0].value1).toBe("array2-0-value1");
    expect(store.array2[1].value1).toBe("array2-2-value1");
    expect(store.array2[3]).toBeUndefined();

    expect(unwrap(store.array2)).toEqual([
      { value1: "array2-0-value1", value2: "array2-0-value2" },
      { value1: "array2-2-value1", value2: "array2-2-value2" },
    ]);
  });

  test("Push to array triggers callback", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);
    configure(store, { intermediates: true });
    void store.array1;
    configure(store, { select: false });

    store.array1.push({ value1: "Movie 3", value2: "test" });

    // 2 calls because store.array1.length and store.array1[3] are modified
    expect(mockListener).toHaveBeenCalledTimes(2);
  });

  test("Push to array triggers callback when unwrapped", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    observe(store.array1);
    configure(store, { select: false });

    store.array1.push({ value1: "Movie 3", value2: "test" });

    // 2 calls because store.array1.length and store.array1[3] are modified
    expect(mockListener).toHaveBeenCalledTimes(2);
  });

  // This test is necessary because pushing to an array automatically changes the length property; by the time
  // the setter is invoked, the length is already changed and the callback is not triggered due to the identical value being set.
  // There is a special case to handle this in the array observer implementation.
  test("Pushing to array triggers callback when observing length", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    void store.array1.length;
    configure(store, { select: false });

    store.array1.push({ value1: "Movie 3", value2: "test" });

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Splicing an array modifies values and triggers callbacks", () => {
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();

    const data = createData();

    const store1 = createObserver(data, mockListener1);
    const store2 = createObserver(data, mockListener2);

    // Observe store1
    configure(store1, { select: true });
    observe(store1.array1);
    observe(store1.array1[1]);
    void store1.array1[1].value1;
    configure(store1, { select: false });

    // Observe store2 (differently from store1, to ensure callbacks are being triggered correctly)
    configure(store2, { select: true });
    observe(store2.array1[1]);
    void store2.array1[1].value1;
    configure(store2, { select: false });

    store1.array1.splice(1, 1);

    expect(store1.array1[0].value1).toBe("array1-0-value1");
    expect(store1.array1[1].value1).toBe("array1-2-value1");
    expect(store1.array1[2]).toBeUndefined();
    expect(store2.array1[0].value1).toBe("array1-0-value1");
    expect(store2.array1[1].value1).toBe("array1-2-value1");
    expect(store2.array1[2]).toBeUndefined();

    expect(mockListener1).toHaveBeenCalledTimes(4);
    expect(mockListener2).toHaveBeenCalledTimes(1);
  });

  test("Splicing an array and then modifying values triggers callbacks correctly", () => {
    const mockListener1 = jest.fn();
    const mockListener2 = jest.fn();

    const data = createData();

    const store1 = createObserver(data, mockListener1);
    const store2 = createObserver(data, mockListener2);

    // Observe store1
    configure(store1, { select: true });
    observe(store1.array1);
    observe(store1.array1[1]);
    void store1.array1[1].value1;
    configure(store1, { select: false });

    // Observe store2 (differently from store1, to ensure callbacks are being triggered correctly)
    configure(store2, { select: true });
    observe(store2.array1[1]);
    void store2.array1[1].value1;
    configure(store2, { select: false });

    store1.array1.splice(1, 1);

    mockListener1.mockClear();
    mockListener2.mockClear();

    store2.array1[1].value1 = "new-array1-1-value1";

    // Check values
    expect(store1.array1[0].value1).toBe("array1-0-value1");
    expect(store1.array1[1].value1).toBe("new-array1-1-value1");
    expect(store1.array1[2]).toBeUndefined();
    expect(store2.array1[0].value1).toBe("array1-0-value1");
    expect(store2.array1[1].value1).toBe("new-array1-1-value1");
    expect(store2.array1[2]).toBeUndefined();

    expect(mockListener1).toHaveBeenCalledTimes(3);
    expect(mockListener2).toHaveBeenCalledTimes(2);
  });

  test("Directly assigning an object/array value invalidates all child DataNodes", () => {
    /**
     * This test is because re-assigning an object/array value must clear that DataNode's children,
     * otherwise existing DataNodes may get reused that have the wrong type.
     */

    const data = {
      array: [
        {
          value1: "value1",
          value2: "value2",
        },
      ],
    };

    const store = createObserver(data, () => {});

    derive(() => {
      return store.array.flatMap((v) => Object.values(v));
    });

    store.array = [["value3"]] as any;
  });
});
