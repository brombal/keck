import { atomic, observe } from 'keck';
import { vi } from 'vitest';

describe('observe() with derive', () => {
  test('Changing derive fn return value triggers callback', () => {
    const mockCallback = vi.fn();
    const mockDerive = vi.fn();
    const state = observe(
      { value1: 1, value2: 1, value3: 1, value4: {} },
      {
        derive: (s) => {
          mockDerive();
          return s.value1 + s.value2;
        },
        onChange: () => mockCallback(),
      },
    );
    vi.clearAllMocks();

    state.value1 = 2;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockDerive).toHaveBeenCalledTimes(1);
    vi.resetAllMocks();

    atomic(() => {
      // Current derived output is 3; make a change that will not change output
      state.value1 = 3;
      state.value2 = 0;
    });
    expect(mockCallback).toHaveBeenCalledTimes(0);
    expect(mockDerive).toHaveBeenCalledTimes(1);
    vi.resetAllMocks();

    // One more time for good measure
    atomic(() => {
      // Current derived output is 3; make a change that will change output
      state.value1 = 3;
      state.value2 = 1;
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockDerive).toHaveBeenCalledTimes(1);
    vi.resetAllMocks();

    // Modifying property that is not accessed in derive fn does not invoke derive fn or trigger callback
    state.value3 = 2;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    expect(mockDerive).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();
  });

  // TODO: For now it's not recommended to use multiple different observable objects in a derive
  //  function, because the current implementation will not trigger the callback if the other object
  //  is modified.
  //  test "Changing derive fn return value from other state object triggers callback"
});
