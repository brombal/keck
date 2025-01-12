import { jest } from '@jest/globals';
import { atomic, derive, focus, observe } from 'keck';
import { createData } from '../shared-data';

describe('derive()', () => {
  test('Changing value that alters derived value triggers callback (primitive used in derived fn)', () => {
    const mockCallback = jest.fn();

    const data = createData();
    data.value2 = 2;

    const state = observe(data, mockCallback);
    focus(state);

    const isEven = derive(() => state.value2 % 2 === 0);
    expect(isEven).toBe(true);

    state.value2 = 3;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    state.value2 = 5;

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Changing value that alters derived value triggers callback (only objects used in derived fn)', () => {
    const mockCallback = jest.fn();

    const data = createData();

    const state = observe(data, mockCallback);
    focus(state);

    const hasObject1 = derive(() => !!state.object1);
    expect(hasObject1).toBe(true);

    delete (state as any).object1;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    (state as any).object1 = false;

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Reused derive fn is only triggered once per modification', () => {
    const mockCallback = jest.fn();

    const state = observe(
      {
        value: 1,
      },
      mockCallback,
    );
    focus(state);

    let returnValue = {};

    const mockDeriveFn = jest.fn();
    const deriveFn = () => {
      mockDeriveFn();
      void state.value;
      return returnValue;
    };
    derive(deriveFn);
    derive(deriveFn);
    focus(state, false);

    jest.clearAllMocks();

    returnValue = {};
    state.value++;

    expect(mockDeriveFn).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // No change to returnValue
    state.value++;

    expect(mockDeriveFn).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Changing a value that is focused normally triggers callback regardless of derived value', () => {
    const data = createData();
    data.value2 = 2;

    const mockCallback = jest.fn();
    const state = observe(data, mockCallback);
    focus(state);
    void state.value2;

    const mockDeriveFn = jest.fn();
    derive(() => {
      mockDeriveFn();
      return state.value2 % 2 === 0;
    });
    // creating the derived function will call it, so clear the call
    jest.clearAllMocks();

    state.value2 = 3;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    expect(mockDeriveFn).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    state.value2 = 4;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    expect(mockDeriveFn).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });

  test('Only result of outer derive call triggers callback', () => {
    const mockCallback = jest.fn();

    const data = createData();
    data.value2 = 2;

    const state = observe(data, mockCallback);
    focus(state);

    derive(() => {
      const isEven = derive(() => state.value2 % 2 === 0);
      const isTriple = state.value2 % 3 === 0;
      return isEven && isTriple;
    });

    // Even to even-triple (callback)
    state.value2 = 6;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // no change (no callback)
    state.value2 = 12;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // even-triple to even (callback)
    state.value2 = 4;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // even to triple (no callback)
    state.value2 = 3;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });

  test('Derive with a custom comparison function only triggers callback when comparison changes', () => {
    const mockCallback = jest.fn();

    const state = observe(
      {
        value1: 1,
        value2: 2,
        value3: 3,
      },
      mockCallback,
    );
    focus(state);

    derive(
      () => [state.value1, state.value2, state.value3],
      (a, b) => a.some((v) => b.includes(v)),
    );
    focus(state, false);

    // No overlap (callback is triggered)
    atomic(() => {
      state.value1 = 4;
      state.value2 = 5;
      state.value3 = 6;
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // Overlap (callback is not triggered)
    atomic(() => {
      state.value1 = 6;
      state.value2 = 7;
      state.value3 = 8;
    });
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Multiple states in a derive fn trigger callbacks minimal number of times', () => {
    /**
     * Creates 3 derived functions that access various properties of 2 state objects.
     * The property names of each state object indicate which derived functions they are used in.
     * The derived functions just return plain objects (unrelated to the state), so that it is easy
     * to control whether the derived function return values change and cause their observers'
     * callbacks to trigger.
     * Then we modify the state objects atomically, and ensure that each derived function and the
     * observer callbacks are called a minimal number of times.
     */

    const mockFn1 = jest.fn();
    const state1 = observe(
      {
        value_1: 1,
        value_1_2: 1,
        value_1_2_3: 1,
      },
      mockFn1,
    );
    focus(state1);

    const mockFn2 = jest.fn();
    const state2 = observe(
      {
        value_2: 1,
        value_2_3: 1,
        value3: 1,
      },
      mockFn2,
    );
    focus(state2);

    // derive 1
    let derive1result = {};
    const mockDeriveFn1 = jest.fn();
    derive(() => {
      mockDeriveFn1();
      void state1.value_1;
      void state1.value_1_2;
      void state1.value_1_2_3;
      return derive1result;
    });
    jest.clearAllMocks();

    // derive 2
    let derive2result = {};
    const mockDeriveFn2 = jest.fn();
    derive(() => {
      mockDeriveFn2();
      void state2.value_2;
      void state1.value_1_2;
      void state2.value_2_3;
      void state1.value_1_2_3;
      return derive2result;
    });
    jest.clearAllMocks();

    // derive 3
    const derive3result = {};
    const mockDeriveFn3 = jest.fn();
    derive(() => {
      mockDeriveFn3();
      void state2.value_2_3;
      void state1.value_1_2_3;
      return derive3result;
    });
    jest.clearAllMocks();

    focus(state1, false);
    focus(state2, false);

    // Only trigger derive 1, no change in derive result
    atomic(() => {
      state1.value_1++;
    });
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn1).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn2).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn3).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // Only trigger derive 2, change derive 2 result
    atomic(() => {
      state2.value_2++;
      derive2result = {};
    });
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn1).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn2).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn3).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // Trigger derive 1 and 2, only change derive 1 result
    atomic(() => {
      state1.value_1++;
      state2.value_2++;
      state1.value_1_2++;
      derive1result = {};
    });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn1).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn2).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn3).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // Trigger all 3 derives, change all derive results
    atomic(() => {
      state1.value_1++;
      state1.value_1_2_3++;
      state2.value_2_3++;
      derive1result = {};
      derive2result = {};
    });
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn1).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn2).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn3).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // Trigger all 3 derives, no change in derive results
    atomic(() => {
      state1.value_1++;
      state1.value_1_2_3++;
      state2.value_2_3++;
    });
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn1).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn2).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn3).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
  });

  test('Reading properties of derive fn result should not create observation (i.e. result is unwrapped)', () => {
    const mockCallback = jest.fn();

    const state = observe(
      {
        values: [1, 2, 3],
      },
      mockCallback,
    );
    focus(state);

    const values = derive(() => {
      return state.values;
    });

    values.push(4);

    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();
  });
});
