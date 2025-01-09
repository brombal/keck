import { focus, observe, deep } from "keck";
import { jest } from "@jest/globals";
import { createData } from "../shared-data";

describe("deep()", () => {
  test("Modifying descendant property of deep observed object triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);
    deep(store1.object1);
    deep(store1.object2);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);
    deep(store2.object1);

    store1.object1.value1 = "new-object1-value1";
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store1.object2.value1 = "new-object2-value1";
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test("Replacing deep observed object triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);
    deep(store1.object1);
    deep(store1.object2);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);
    deep(store2.object1);

    const newObject1 = { value1: "new-object1-value1" } as any;
    store1.object1 = newObject1;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    store1.object2 = "new-object2-value1" as any;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test("Replacing ancestor of deep observed object triggers callback", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);
    deep(store1.object1.value5);
    deep(store1.object2.value3);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);
    deep(store2.object1.value5);

    const newObject1 = { value1: "new-object-value1" } as any;
    store1.object1 = newObject1;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    const newObject2 = "new-object-value1" as any;
    store1.object2.value3 = newObject2;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
  });

  test('deep() on non-observable throws error', () => {
    expect(() => deep({})).toThrowError();
  });
});
