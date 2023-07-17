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

describe("Objects", () => {
  test("Writing deep properties triggers callback and modifies store & source", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);


    void store.value1;
    void store.array1[0].value1;
    void store.array1[0].value2;
    configure(store, { select: false });

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

    expect(mockListener).toHaveBeenCalledTimes(3);
  });

  test("Deleting properties triggers callbacks with correct value", () => {
    const mockListener = jest.fn();
    const data = createData();

    const store = createObserver(data, (value, prop) => mockListener({ ...value }, prop));


    observe(store.array1);
    void store.array1[0].value1;
    configure(store, { select: false });

    delete (store.array1[0] as any).value1;
    expect(mockListener).toHaveBeenCalledTimes(2);
    expect(mockListener.mock.calls[0][0]).not.toHaveProperty("value1");
    mockListener.mockClear();

    delete (store as any).array1;

    expect(mockListener).toHaveBeenCalledTimes(1);
    expect(mockListener.mock.calls[0][0]).not.toHaveProperty("array1");
  });

  test("Setting identical value doesn't trigger callback", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);

    observe(store.value1);
    observe(store.array1);

    store.value1 = "value1";
    store.array1 = data.array1;
    store.array1[0] = data.array1[0];

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Calling toJSON on observables works on objects and arrays", () => {
    const object = { object: "object" };
    const store = createObserver(object, () => {});
    expect((store as any).toJSON()).toEqual(object);

    const array = [1, 2, 3];
    const store2 = createObserver(array, () => {});
    expect((store2 as any).toJSON()).toEqual(array);
  });

  test("`in` creates an observation on the object", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver(data, mockFn);

    expect("value2" in store.object1).toBe(true);

    void ("value2" in store.object1);
    store.object1.value2 = "new-object1-value2";

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("`Object.keys` creates an observation on the object", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver(data, mockFn);

    Object.keys(store.object1);
    store.object1.value2 = "new-object1-value2";

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("`Object.values` creates an observation on the object", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver(data, mockFn);

    Object.values(store.object1);
    store.object1.value2 = "new-object1-value2";

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("`Object.entries` creates an observation on the object", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver(data, mockFn);

    Object.entries(store.object1);
    store.object1.value2 = "new-object1-value2";

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("for loop creates an observation on the object", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver(data, mockFn);

    const keys = [];
    for (const key in store.object1) {
      keys.push(key);
    }
    expect(keys).toEqual(["value1", "value2"]);

    store.object1.value2 = "new-object1-value2";

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("Selector only rerenders when derived value changes", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver(data, mockFn);

    const keys = [];
    for (const key in store.object1) {
      keys.push(key);
    }
    expect(keys).toEqual(["value1", "value2"]);

    store.object1.value2 = "new-object1-value2";

    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test("Replacing object works", () => {
    const mockFn = jest.fn();
    const data = createData();
    const store = createObserver({
      sub1: {
        sub2: {
          sub3: {
            value1: "value1",
          }
        }
      }
    }, mockFn);

    void store.sub1.sub2.sub3.value1;

    store.sub1 = { sub2: { sub3: { value1: "new-value1" } } };

    expect(store.sub1.sub2.sub3.value1).toBe("new-value1");
  });
});
