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
  test("Modifying children does not trigger callback for intermediates when disabled", () => {
    const mockListener = jest.fn();

    const data = createData();

    const [store, { disable }] = observe(data, mockListener);

    unwrap(store.array1);
    unwrap(store.array2[0]);

    disable();

    store.array1[2] = { value1: "x", value2: "x" };
    store.array2[0].value1 = "array2-0-value1";

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callbacks are not triggered after observer is disabled", () => {
    const mockListener = jest.fn();

    const data = createData();

    const [store, { stop, disable }] = observe(data, mockListener);

    void store.value1;

    stop();

    store.value1 = "new-value1-1";
    expect(mockListener).toHaveBeenCalledTimes(1);
    mockListener.mockClear();

    disable();

    store.value1 = "new-value1-2";

    // Check that callback was called correctly
    expect(mockListener).toHaveBeenCalledTimes(0);
  });

  test("Callbacks are triggered again when explicitly re-enabled", () => {
    const mockListener = jest.fn();

    const data = createData();

    const [store, { start, disable, enable }] = observe(data, mockListener);

    void store.value1;
    store.value1 = "new-value1-1";
    expect(mockListener).toHaveBeenCalledTimes(1);

    disable();

    mockListener.mockClear();
    store.value1 = "new-value1-2";
    expect(mockListener).toHaveBeenCalledTimes(0);

    enable();

    mockListener.mockClear();
    store.value1 = "new-value1-3";
    expect(mockListener).toHaveBeenCalledTimes(1);
  });
});
