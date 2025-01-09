import { focus, observe, silent } from "keck";
import { jest } from "@jest/globals";

describe("silent()", () => {
  test("Silent modifications do not trigger callback", () => {
    const data = { value: 1 };

    // Regular store
    const mockCallback1 = jest.fn();
    const store1 = observe(data, mockCallback1);

    // Focused store
    const mockCallback2 = jest.fn();
    const store2 = observe(data, mockCallback2);
    focus(store2);
    void store2.value;
    focus(store2, false);

    const silentMock1 = jest.fn();
    silent(() => {
      silentMock1();
      store1.value = 2;
    });

    expect(silentMock1).toHaveBeenCalledTimes(1);
    expect(store1.value).toBe(2);
    expect(store2.value).toBe(2);
    expect(mockCallback1).toHaveBeenCalledTimes(0);
    expect(mockCallback2).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    const silentMock2 = jest.fn();
    silent(() => {
      silentMock2();
      store2.value = 3;
    });

    expect(silentMock2).toHaveBeenCalledTimes(1);
    expect(store1.value).toBe(3);
    expect(store2.value).toBe(3);
    expect(mockCallback1).toHaveBeenCalledTimes(0);
    expect(mockCallback2).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();
  });

  test("Silent modifications still cause object references to be different", () => {
    const mockCallback = jest.fn();
    const store = observe({ value1: {}, value2: {} }, mockCallback);

    const originalValue1 = store.value1;
    const originalValue2 = store.value2;

    silent(() => {
      store.value1 = {};
    });

    expect(store.value1).not.toBe(originalValue1);
    expect(store.value2).toBe(originalValue2);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });
});
