import { configure, createObserver, unwrap, observe } from "#src";

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

describe("observe", () => {
  test("Observing root object observes values", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener);
    observe(store);
    configure(store, { select: false });

    store.value1 = "new-value1";

    expect(store.value1).toBe("new-value1");
    expect(unwrap(store)).toBe(data);

    expect(mockListener).toHaveBeenCalledTimes(1);
  });

  test("Observing intermediate values enables observation", () => {
    const mockListener1 = jest.fn();

    const data = createData();

    const store = createObserver(data, mockListener1);
    observe(store.object1);
    observe(store.array1);
    configure(store, { select: false });

    store.object1.value1 = "new-object1-value1";
    store.array1[0].value1 = "new-array1-0-value1";

    expect(store.object1.value1).toBe("new-object1-value1");
    expect(store.array1[0].value1).toBe("new-array1-0-value1");

    expect(mockListener1).toHaveBeenCalledTimes(2);
  });
});
