import { observe, ref, unwrap } from "#src";

describe("wrap", () => {
  test("Modifying ref doesn't trigger callback", () => {
    const mockFn = jest.fn();
    const data = {
      value: 1,
      object1: {
        value: 2,
      },
      object2: {} as any,
    };
    const state = observe(data, mockFn);
    unwrap(state.object2);

    state.object2 = ref({
      value: 3,
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
    mockFn.mockClear();

    void state.object2.value;
    state.object2.value = 4;
    expect(mockFn).toHaveBeenCalledTimes(0);

    expect(state.object2).toBe(data.object2);
    expect(state.object1).not.toBe(data.object1);
  });

  test("Creating ref from primitive has no effect", () => {
    const mockFn = jest.fn();
    const data = {
      value: 1,
      object1: {
        value: 2,
      },
      object2: {} as any,
    };
    const state = observe(data, mockFn);
    unwrap(state.object2);

    state.object2 = ref(3 as any);

    expect(mockFn).toHaveBeenCalledTimes(1);
    mockFn.mockClear();

    state.object2 = 4;
    expect(mockFn).toHaveBeenCalledTimes(1);

    expect(state.object2).toBe(data.object2);
  });
});
