import { configure, observe, unwrap } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
  ],
});

describe("unobserve", () => {
  test("Accessing properties after unobserving does not create observers", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = observe(data, mockListener);
    configure(store, { observe: false });

    void store.value2;

    store.value2 = 40;

    // Check that original object was modified
    expect(data.value2).toBe(40);

    // Check that proxy object was modified
    expect(store.value2).toBe(40);

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Modifying children does not trigger callback for intermediates when not observing", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = observe(data, mockListener);
    configure(store, { observe: false });

    unwrap(store.array1);
    unwrap(store.array2[0]);

    store.array1[2] = { value1: "x", value2: "x" };
    store.array2[0].value1 = "array2-0-value1";

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Properties are observed again when observe is re-enabled", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = observe(data, mockListener);

    void store.value1;
    configure(store, { observe: false });
    
    store.value1 = "new-value1";

    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    // Not observing
    void store.value2;
    store.value2 = 123;
    expect(mockListener).toHaveBeenCalledTimes(0);

    configure(store, { observe: true });
    void store.value2;
    configure(store, { observe: false });
    store.value2 = 456;
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    // Not observing
    void store.value3;
    store.value3 = !store.value3;
    expect(mockListener).toHaveBeenCalledTimes(0);
  });
});
