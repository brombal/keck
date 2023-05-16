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

describe("Objects & arrays", () => {
  test("Callbacks are not triggered when observer is disabled", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = observe(data, mockListener);

    configure(store, { enabled: false });

    store.array1[2] = { value1: "x", value2: "x" };
    store.array2[0].value1 = "array2-0-value1";

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callbacks are not triggered when observer is disabled (select mode)", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = observe(data, mockListener);

    void store.value1;

    store.value1 = "new-value1-1";
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    configure(store, { enabled: false });

    store.value1 = "new-value1-2";

    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callbacks are triggered again when explicitly re-enabled", () => {
    const mockListener = jest.fn();

    const data = createData();

    const store = observe(data, mockListener);
    void store.value1;
    configure(store, { observe: false });

    store.value1 = "new-value1-1";
    expect(mockListener).toHaveBeenCalledTimes(1);

    configure(store, { enabled: false });

    mockListener.mockClear();
    store.value1 = "new-value1-2";
    expect(mockListener).toHaveBeenCalledTimes(0);

    configure(store, { enabled: true });

    mockListener.mockClear();
    store.value1 = "new-value1-3";
    expect(mockListener).toHaveBeenCalledTimes(1);
  });
});
