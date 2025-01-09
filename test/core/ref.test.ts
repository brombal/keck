import { deep, focus, isRef, observe, ref, unwrap } from "keck";
import { jest } from "@jest/globals";

describe("ref()", () => {
  test("Modifying ref inner property doesn't trigger callback (non-focus mode)", () => {
    const mockCallback = jest.fn();
    const data = {
      object1: {} as any,
    };
    const state = observe(data, mockCallback);

    const newObject2 = { value: 1 };
    state.object1 = ref(newObject2);

    expect(state.object1).toEqual(newObject2);
    expect(unwrap(state.object1)).toBe(newObject2);

    // Callback was triggered for assigning ref
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // Ref's properties should not trigger callback
    state.object1.value = 2;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });

  test("Modifying ref doesn't trigger callback (focus mode)", () => {
    const data = {
      value: 1,
      object1: { value: 1 },
      object2: {} as any,
      object3: {} as any,
    };

    const mockFn1 = jest.fn();
    const state1 = observe(data, mockFn1);
    focus(state1);
    void state1.object2.value;
    deep(state1.object3);
    focus(state1, false);

    const mockFn2 = jest.fn();
    const state2 = observe(data, mockFn2);
    focus(state2);
    void state2.object2.value;
    deep(state2.object3);
    focus(state2, false);

    state1.object2 = ref({ value: 1 });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    state2.object3 = ref({ value: 1 });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // Sanity check; un-accessed properties should not trigger callback
    state1.object1.value = 2;
    state2.object1.value = 3;
    expect(mockFn1).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // Modifying property of refs should not trigger callbacks
    state1.object2.value = 2;
    state1.object3.value = 2;
    state2.object2.value = 3;
    state2.object3.value = 3;
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // Replacing ref with other ref should trigger callback
    state1.object3 = ref({});
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // Getting ref values should have original unwrapped values
    expect(state1.object2).toBe(data.object2);
    expect(state1.object3).toBe(data.object3);
    expect(state2.object2).toBe(data.object2);
    expect(state2.object3).toBe(data.object3);
  });

  test("Creating ref from primitive has no effect", () => {
    const mockCallback = jest.fn();
    const data = {
      object1: {} as any,
    };
    const state = observe(data, mockCallback);
    deep(state.object1);

    state.object1 = ref(3 as any);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    state.object1 = 4;
    expect(mockCallback).toHaveBeenCalledTimes(1);

    expect(state.object1).toBe(data.object1);
  });

  test("Creating ref from non-observable value has no effect", () => {
    const mockCallback = jest.fn();
    const data = {
      value: 1,
      object1: {
        value: 2,
      },
      object2: {} as any,
    };
    const state = observe(data, mockCallback);

    class Test {
      value = 3;
    }

    const testObj = new Test();

    state.object2 = ref(testObj);
    expect(isRef(data.object2)).toBe(false);
    expect(isRef(state.object2)).toBe(false);
    expect(data.object2).toBe(testObj);
    expect(state.object2).toBe(testObj);

    jest.clearAllMocks();

    state.object2.value = 4;
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test("Creating ref from null or undefined value has no effect", () => {
    const mockCallback = jest.fn();
    const data = {
      object1: {} as any,
      object2: {} as any,
    };
    const state = observe(data, mockCallback);
    deep(state.object2);

    state.object1 = ref(undefined);
    expect(state.object1).toBeUndefined();

    state.object2 = ref(null);
    expect(state.object2).toBeNull();
  });
});
