import { atomic, focus, observe } from "keck";
import { jest } from "@jest/globals";
import { createData } from "../shared-data";

describe("atomic()", () => {
  test("Atomic modifications only trigger callback once (non-focus mode)", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);

    atomic(() => {
      store1.object1.value1 = "new-value1";
      store1.object2.value1 = "new-value1";
    });

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test("Atomic modifications only trigger callback once (focus mode)", () => {
    const data = createData();

    const mockFn1 = jest.fn();
    const store1 = observe(data, mockFn1);
    focus(store1);
    void store1.object1.value1;
    void store1.object1.value2;
    focus(store1, false);

    const mockFn2 = jest.fn();
    const store2 = observe(data, mockFn2);
    focus(store2);
    void store2.object1.value1;
    void store2.object2.value1;
    focus(store2, false);

    atomic(() => {
      store1.object1.value1 = "new-value1";
      store1.object1.value2 = "new-value1";
      store1.object2.value1 = "new-value1";
    });

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });
});
