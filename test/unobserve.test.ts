import { createObserver, unwrap } from "#src";

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

function noop() {}

describe("unobserve", () => {
  test("Accessing properties after unobserving does not create observers", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store, unobserve } = createObserver(data, mockListener);
    unobserve();

    void store.value2;

    store.value2 = 40;

    // Check that original object was modified
    expect(data.value2).toBe(40);

    // Check that proxy object was modified
    expect(store.value2).toBe(40);

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Modifying children does not trigger callback for intermediates when not observing", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store, unobserve } = createObserver(data, mockListener);
    unobserve();

    unwrap(store.array1);
    unwrap(store.array2[0]);

    store.array1[2] = { value1: "x", value2: "x" };
    store.array2[0].value1 = "array2-0-value1";

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Properties are observed again when observe() is called again", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store, observe, unobserve } = createObserver(data, mockListener);

    void store.value1;
    unobserve();
    store.value1 = "new-value1";

    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    // Not observing
    void store.value2;
    store.value2 = 123;
    expect(mockListener).toHaveBeenCalledTimes(0);

    observe();
    void store.value2;
    unobserve();
    store.value2 = 456;
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    // Not observing
    void store.value3;
    store.value3 = !store.value3;
    expect(mockListener).toHaveBeenCalledTimes(0);
  });
});