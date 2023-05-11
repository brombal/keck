import { observe, unwrap } from "#src";

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

describe("Objects & arrays", () => {
  test("Writing deep properties triggers callback and modifies store & source", () => {
    const mockListener = jest.fn();

    const data = createData();

    const [store] =observe(data, mockListener);

    void store.value1;
    void store.array1[0].value1;
    void store.array1[0].value2;

    store.value1 = "new-value1";
    store.array1[0].value1 = "new-array1-0-value1";
    store.array1[0].value2 = "new-array1-0-value2";

    // Check that original object was modified
    expect(data.value1).toBe("new-value1");
    expect(data.array1[0].value1).toBe("new-array1-0-value1");
    expect(data.array1[0].value2).toBe("new-array1-0-value2");

    // Check that proxy object was modified
    expect(store.value1).toBe("new-value1");
    expect(store.array1[0].value1).toBe("new-array1-0-value1");
    expect(store.array1[0].value2).toBe("new-array1-0-value2");

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(3);
  });

  test("Deleting properties triggers callbacks", () => {
    const mockListener = jest.fn();
    const data = createData();

    const [store] =observe(data, mockListener);

    unwrap(store.array1);
    void store.array1[0].value1;

    delete (store.array1[0] as any).value1;
    delete (store as any).array1;

    expect(mockListener).toHaveBeenCalledTimes(3);
  });

  test("Setting identical value doesn't trigger callback", () => {
    const mockListener = jest.fn();

    const data = createData();

    const [store] =observe(data, mockListener);

    unwrap(store.value1);
    unwrap(store.array1);

    store.value1 = "value1";
    store.array1 = data.array1;
    store.array1[0] = data.array1[0];

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(0);
  });
});
