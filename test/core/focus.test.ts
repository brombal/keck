import { focus, observe } from "#keck";

import { createData } from "../shared-data";

describe("focus mode", () => {
  test("Modifying focused properties triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);

    // Focus object1.value1 in both stores
    void store1.object1.value1;
    void store2.object1.value1;

    // Focus object1.value2 only in store1
    void store1.object1.value2;

    // Focus deletable object1.value3 in both stores
    void store1.object1.value3;
    void store2.object1.value3;

    // Focus object2.value1 only in store2
    void store2.object2.value1;

    // Pause focusing
    focus(store1, false);
    focus(store2, false);

    store1.object1.value1 = "new-object1-value1";
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    store1.object1.value2 = "new-object1-value2";
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();

    delete store1.object1.value3;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    store1.object2.value1 = "new-object2-value1";
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    // No modification
    store1.object1.value1 = "new-object1-value1";
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();

    // Not focused
    store1.object2.value2 = "new-object2-value2";
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();
  });

  test("Focusing and modifying object does not trigger callback", () => {
    const data = createData();

    const mockCallback = jest.fn();
    const store = observe(data, mockCallback);
    focus(store);

    void store.object1;
    focus(store, false);

    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.object1 = {
      value1: "new-object1-value1",
      value2: "new-object1-value2",
    } as any;

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test("Replacing ancestor of focused property triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);

    void store1.object1.value1;
    void store2.object1.value1;

    store1.object1 = {
      value1: "new-object1-value1",
      value2: "new-object1-value2",
    } as any;

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test("Modifying properties accessed while focus is paused does not trigger callback", () => {
    const data = createData();

    // store1 callback will be triggered on modification of value1 and value3
    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);
    void store1.value1;
    focus(store1, false);
    void store1.value2;
    focus(store1);
    void store1.value3;
    focus(store1, false);

    // store2 callback will be triggered on modification of value1
    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);
    void store2.value1;
    focus(store2, false);
    void store2.value2;
    void store2.value3;

    store1.value1 = "new-value1";
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store1.value2 = 1;
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    store1.value3 = false;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });
});
