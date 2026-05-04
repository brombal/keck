import { deep, focus, isRef, observe, ref, unwrap } from 'keck';
import { vi } from 'vitest';

describe('ref()', () => {
  test("Modifying ref inner property doesn't trigger callback (non-focus mode)", () => {
    const mockCallback = vi.fn();
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
    vi.clearAllMocks();

    // Ref's properties should not trigger callback
    state.object1.value = 2;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test("Modifying ref doesn't trigger callback (focused mode)", () => {
    const data = {
      value: 1,
      object1: { value: 1 },
      object2: {} as any,
      object3: {} as any,
    };

    const mockFn1 = vi.fn();
    const state1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(state1);
    void state1.object2.value;
    deep(state1.object3);
    commit1();

    const mockFn2 = vi.fn();
    const state2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(state2);
    void state2.object2.value;
    deep(state2.object3);
    commit2();

    state1.object2 = ref({ value: 1 });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    state2.object3 = ref({ value: 1 });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    // Sanity check; un-accessed properties should not trigger callback
    state1.object1.value = 2;
    state2.object1.value = 3;
    expect(mockFn1).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    // Modifying property of refs should not trigger callbacks
    state1.object2.value = 2;
    state1.object3.value = 2;
    state2.object2.value = 3;
    state2.object3.value = 3;
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    // Replacing ref with other ref should trigger callback
    state1.object3 = ref({});
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    // Getting ref values should have original unwrapped values
    expect(state1.object2).toBe(data.object2);
    expect(state1.object3).toBe(data.object3);
    expect(state2.object2).toBe(data.object2);
    expect(state2.object3).toBe(data.object3);
  });

  test('Creating ref from primitive has no effect', () => {
    const mockCallback = vi.fn();
    const data = {
      object1: {} as any,
    };
    const state = observe(data, mockCallback);
    deep(state.object1);

    state.object1 = ref(3 as any);

    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    state.object1 = 4;
    expect(mockCallback).toHaveBeenCalledTimes(1);

    expect(state.object1).toBe(data.object1);
  });

  test('Creating ref from non-observable value has no effect', () => {
    const mockCallback = vi.fn();
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

    vi.clearAllMocks();

    state.object2.value = 4;
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Creating ref from null or undefined value has no effect', () => {
    const mockCallback = vi.fn();
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

  test('ref() works with non-extensible objects', () => {
    const mockCallback = vi.fn();
    const data = {
      frozen: {} as any,
      sealed: {} as any,
      nonExtensible: {} as any,
    };
    const state = observe(data, mockCallback);

    const frozenObj = Object.freeze({ value: 1 });
    const sealedObj = Object.seal({ value: 1 });
    const nonExtObj = Object.preventExtensions({ value: 1 });

    // None of these should throw
    expect(() => {
      state.frozen = ref(frozenObj);
    }).not.toThrow();
    expect(() => {
      state.sealed = ref(sealedObj);
    }).not.toThrow();
    expect(() => {
      state.nonExtensible = ref(nonExtObj);
    }).not.toThrow();

    // Values should be accessible correctly
    expect(state.frozen).toBe(frozenObj);
    expect(state.sealed).toBe(sealedObj);
    expect(state.nonExtensible).toBe(nonExtObj);

    vi.clearAllMocks();

    // Modifying mutable property of sealed/non-extensible refs should not trigger callback
    sealedObj.value = 2;
    nonExtObj.value = 2;
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Accessing ref returns unwrapped value', () => {
    const innerObject = {
      value: 'value',
    };
    const state = observe({
      object1: ref(innerObject),
    });

    expect(state.object1).toBe(innerObject);
  });

  test("Reassigning ref of same object doesn't trigger rerender", () => {
    const mockCallback = vi.fn();
    const state = observe(
      {
        object1: ref({
          value: 'value',
        }),
      },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(state);
    void state.object1.value;
    commit();

    // Assigning same ref should not trigger callback
    state.object1 = ref(state.object1);
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Assigning different ref should trigger callback
    state.object1 = ref({ value: 'value' });
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
