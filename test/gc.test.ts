import { focus, observe, reset } from "keck";
import { jest } from "@jest/globals";
import { createData } from "./shared-data";

describe("Garbage collection", () => {
  test("Garbage is collected when observable goes out of scope (non-focus)", async () => {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = jest.fn();

    const r = new FinalizationRegistry(mockCleanupFn);

    const mockCallback = jest.fn();

    (() => {
      const store = observe(createData(), mockCallback);

      void store.value1;
      store.value1 = "new-value1";

      expect(mockCallback).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();
      r.register(store, "value1");
    })();

    global.gc!();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
  });

  test("Garbage is collected when observable goes out of scope (focus)", async () => {
    expect(global.gc).toBeDefined();

    const mockCleanupFn = jest.fn();

    const r = new FinalizationRegistry(mockCleanupFn);

    const data = createData();
    const mockCallback = jest.fn();

    (() => {
      const store = observe(data, mockCallback);
      focus(store);

      void store.value1;
      store.value1 = "new-value1";
      reset(store);

      expect(mockCallback).toHaveBeenCalledTimes(1);
      jest.clearAllMocks();
      r.register(store, "value1");
    })();

    global.gc!();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCleanupFn).toHaveBeenCalledTimes(1);
  });
});
