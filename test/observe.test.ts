import { configure, createObserver, reset } from "#src";

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

    const store = createObserver(data, mockListener);
    void store.value1;
    configure(store, { select: false });

    store.value1 = "new-value1";

    expect(store.value1).toBe("new-value1");
    expect(data.value1).toBe("new-value1");

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Deep properties trigger callback", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener1);
    void store.object1.value1;
    configure(store, { select: false });

    store.object1.value1 = "new-object1-value1";

    expect(mockListener1).toHaveBeenCalledTimes(1);
  });

  test("References are equal after modification", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener1);

    const before = store.object1;
    store.object1.value1 = "new-object1-value1";

    expect(before).toBe(store.object1);
  });

  test("Multiple observers trigger each other", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);
    void store.value1;

    store.value1 = "new-value1";

    expect(store.value1).toBe("new-value1");
    expect(data.value1).toBe("new-value1");

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Select mode basic test works", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    void store.value1;
    configure(store, { select: false });

    store.value1 = "new-value1";
    store.value2 = 1;

    expect(store.value1).toBe("new-value1");
    expect(store.value2).toBe(1);
    expect(data.value1).toBe("new-value1");
    expect(data.value2).toBe(1);

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Creating an observable from another observable works", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store1 = createObserver(data, mockListener);

    const store2 = createObserver(store1, mockListener);

    void store2.value1;
    configure(store2, { select: false });

    store2.value1 = "new-value1";

    expect(store2.value1).toBe("new-value1");
    expect(data.value1).toBe("new-value1");

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Creating an observable from a primitive throws", () => {
    expect(() => createObserver("primitive" as any, () => {})).toThrow();
  });

  test("Accessing intermediates does not create observation", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    void store.object1;
    void store.array1[0];
    configure(store, { select: false });

    store.object1.value1 = "array1-0-value1";
    store.array1[0].value1 = "array2-0-value1";

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Configuring non-root should fail", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    expect(() => configure(store.object1, { select: false })).toThrow();
  });

  test("Resetting non-root should fail", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    expect(() => reset(store.object1)).toThrow();
  });

  test("Assigning primitive to previous observable value should work", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    void store.object1;

    store.object1 = "primitive" as any;

    expect(store.object1).toBe("primitive");
    expect(data.object1).toBe("primitive");
  });

  test("Stale references should throw error", () => {
    const store = createObserver({ a: [{ b: 0 }, { b: 1 }] }, () => {
      console.log(store.a[0]);
      console.log(store.a[1]);
    });
    const a = store.a;
    configure(store, { clone: true });

    // Swap values
    const a0 = a[0];
    const a1 = a[1];
    a[0] = a1;

    expect(() => {
      a[1] = a0;
    }).toThrow("You are using a stale reference to an observable value.");
  });
});
