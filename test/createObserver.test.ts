import { createObserver } from "#src";

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

describe("createObserver", () => {
  test("Basic smoke test", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store, stop } = createObserver(data, mockListener);
    const o = createObserver(data, mockListener);

    void store.value1;
    stop();

    store.value1 = "new-value1";

    expect(store.value1).toBe("new-value1");
    expect(data.value1).toBe("new-value1");

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Creating an observable from another observable works", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store: store1, stop } = createObserver(data, mockListener);

    const { store: store2, stop: unobserve2 } = createObserver(store1, mockListener);

    void store2.value1;
    stop();

    store2.value1 = "new-value1";

    expect(store2.value1).toBe("new-value1");
    expect(data.value1).toBe("new-value1");

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Creating an observable from a primitive throws", () => {
    expect(() => createObserver("primitive" as any, () => {})).toThrow();
  });

  test("Accessing intermediates does not create observation", () => {
    const mockListener = jest.fn();

    const data = createData();

    const { store, stop } = createObserver(data, mockListener);

    void store.object1;
    void store.array1[0];
    stop();

    store.object1.value1 = "array1-0-value1";
    store.array1[0].value1 = "array2-0-value1";

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("References to intermediate properties of source change if modified", () => {
    const data = createData();

    // Grab references to original arrays to test references
    const originalarray2 = data.array2;
    const originalarray1 = data.array1;
    const originalarray10 = data.array1[0];
    const originalarray11 = data.array1[1];

    const { store, stop } = createObserver(data, () => {});

    store.array1[0].value1 = "new-array1-0-value1";
    stop();

    // Check that object references that were modified are different; but those that weren't modified are identical
    expect(data.array2).toBe(originalarray2);
    expect(data.array1).not.toBe(originalarray1);
    expect(data.array1[0]).not.toBe(originalarray10);
    expect(data.array1[1]).toBe(originalarray11);
  });

  test("References to intermediate properties of store change if modified", () => {
    const data = createData();

    const { store, stop } = createObserver(data, () => {});

    // Grab references to original arrays to test references
    const originalarray2 = store.array2;
    const originalarray1 = store.array1;
    const originalarray10 = store.array1[0];
    const originalarray11 = store.array1[1];
    stop();

    store.array1[0].value1 = "new-array1-0-value1"; // Triggers callback

    // Check that object references that were modified are different; but those that weren't modified are identical
    expect(store.array2).toBe(originalarray2);
    expect(store.array1).not.toBe(originalarray1);
    expect(store.array1[0]).not.toBe(originalarray10);
    expect(store.array1[1]).toBe(originalarray11);
  });
});
