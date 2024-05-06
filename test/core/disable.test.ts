import { observe, disable, enable } from "#keck";

import { createData } from "../shared-data";

describe("disable()", () => {
  test("Callbacks are not triggered when observer is disabled (non-focus mode)", () => {
    const mockCallback = jest.fn();

    const data = createData();
    const store = observe(data, mockCallback);

    disable(store);

    store.object1.value1 = "new-object1-value1";

    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    enable(store);

    store.object1.value1 = "new-object1-value1-2";

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test("Callbacks are not triggered when observer is disabled (focus mode)", () => {
    const mockCallback = jest.fn();

    const data = createData();
    const store = observe(data, mockCallback);

    void store.object1.value1;

    disable(store);

    store.object1.value1 = "new-object1-value1";

    expect(mockCallback).toHaveBeenCalledTimes(0);

    enable(store);

    store.object1.value1 = "new-object1-value1-2";

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
