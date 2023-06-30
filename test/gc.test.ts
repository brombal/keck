import { createObserver, reset, unwrap } from "#src";

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

describe("Garbage collection", () => {
  test("Works", async () => {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = jest.fn();

    const r = new FinalizationRegistry(mockCleanupFn);

    const mockFn = jest.fn();

    (() => {
      const store = createObserver(createData(), mockFn);

      void store.value1;
      store.value1 = "new-value1";

      expect(mockFn).toHaveBeenCalledTimes(1);
      mockFn.mockClear();
      r.register(store, "value1");
    })();

    global.gc!();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
  });

  test("Works after resetting", async () => {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = jest.fn();

    const r = new FinalizationRegistry(mockCleanupFn);

    const data = createData();
    const mockFn = jest.fn();

    (() => {
      const store = createObserver(data, mockFn);

      void store.value1;
      store.value1 = "new-value1";
      reset(store);

      expect(mockFn).toHaveBeenCalledTimes(1);
      mockFn.mockClear();
      r.register(store, "value1");
    })();

    global.gc!();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
  });
});
