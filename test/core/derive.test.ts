import { atomic, derive, focus, observe, unwrap } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

describe('derive()', () => {
  test('Changing value that alters derived value triggers callback (primitive used in derived fn)', () => {
    const mockCallback = vi.fn();

    const data = createData();
    data.value2 = 2;

    const state = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(state);

    const isEven = derive(() => state.value2 % 2 === 0);
    expect(isEven).toBe(true);
    commit();

    state.value2 = 3;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    state.value2 = 5;

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Changing value that alters derived value triggers callback (only objects used in derived fn)', () => {
    const mockCallback = vi.fn();

    const data = createData();

    const state = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(state);

    const hasObject1 = derive(() => !!state.object1);
    expect(hasObject1).toBe(true);
    commit();

    delete (state as any).object1;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    (state as any).object1 = false;

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Reused derive fn is only triggered once per modification', () => {
    const mockCallback = vi.fn();

    const state = observe(
      {
        value: 1,
      },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(state);

    let returnValue = {};

    const mockDeriveFn = vi.fn();
    const deriveFn = () => {
      mockDeriveFn();
      void state.value;
      return returnValue;
    };
    derive(deriveFn);
    derive(deriveFn);
    commit();

    vi.clearAllMocks();

    returnValue = {};
    state.value++;

    expect(mockDeriveFn).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    // No change to returnValue
    state.value++;

    expect(mockDeriveFn).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Changing a value that is focused normally triggers callback regardless of derived value', () => {
    const data = createData();
    data.value2 = 2;

    const mockCallback = vi.fn();
    const state = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(state);
    void state.value2;

    const mockDeriveFn = vi.fn();
    derive(() => {
      mockDeriveFn();
      return state.value2 % 2 === 0;
    });
    // creating the derived function will call it, so clear the call
    vi.clearAllMocks();
    commit();

    state.value2 = 3;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    expect(mockDeriveFn).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    state.value2 = 4;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    expect(mockDeriveFn).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test('Only result of outer derive call triggers callback', () => {
    const mockCallback = vi.fn();

    const data = createData();
    data.value2 = 2;

    const state = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(state);

    derive(() => {
      const isEven = derive(() => state.value2 % 2 === 0);
      const isTriple = state.value2 % 3 === 0;
      return isEven && isTriple;
    });
    commit();

    // Even to even-triple (callback)
    state.value2 = 6;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    // no change (no callback)
    state.value2 = 12;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    // even-triple to even (callback)
    state.value2 = 4;
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    // even to triple (no callback)
    state.value2 = 3;
    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test('Derive with a custom comparison function only triggers callback when comparison changes', () => {
    const mockCallback = vi.fn();

    const state = observe(
      {
        value1: 1,
        value2: 2,
        value3: 3,
      },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(state);

    derive(
      () => [state.value1, state.value2, state.value3],
      (a, b) => a.some((v) => b.includes(v)),
    );
    commit();

    // No overlap (callback is triggered)
    atomic(() => {
      state.value1 = 4;
      state.value2 = 5;
      state.value3 = 6;
    });
    expect(mockCallback).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

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

    const mockFn1 = vi.fn();
    const state1 = observe(
      {
        value_1: 1,
        value_1_2: 1,
        value_1_2_3: 1,
      },
      { focusable: true, onChange: mockFn1 },
    );
    const { commit: commit1 } = focus(state1);

    const mockFn2 = vi.fn();
    const state2 = observe(
      {
        value_2: 1,
        value_2_3: 1,
        value3: 1,
      },
      { focusable: true, onChange: mockFn2 },
    );
    const { commit: commit2 } = focus(state2);

    // derive 1
    let derive1result = {};
    const mockDeriveFn1 = vi.fn();
    derive(() => {
      mockDeriveFn1();
      void state1.value_1;
      void state1.value_1_2;
      void state1.value_1_2_3;
      return derive1result;
    });
    vi.clearAllMocks();

    // derive 2
    let derive2result = {};
    const mockDeriveFn2 = vi.fn();
    derive(() => {
      mockDeriveFn2();
      void state2.value_2;
      void state1.value_1_2;
      void state2.value_2_3;
      void state1.value_1_2_3;
      return derive2result;
    });
    vi.clearAllMocks();

    // derive 3
    const derive3result = {};
    const mockDeriveFn3 = vi.fn();
    derive(() => {
      mockDeriveFn3();
      void state2.value_2_3;
      void state1.value_1_2_3;
      return derive3result;
    });
    vi.clearAllMocks();

    commit1();
    commit2();

    // Only trigger derive 1, no change in derive result
    atomic(() => {
      state1.value_1++;
    });
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn1).toHaveBeenCalledTimes(1);
    expect(mockDeriveFn2).toHaveBeenCalledTimes(0);
    expect(mockDeriveFn3).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

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
    vi.clearAllMocks();

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
    vi.clearAllMocks();

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
    vi.clearAllMocks();

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
    vi.clearAllMocks();
  });

  test('Reading properties of derive fn result should not create observation (i.e. result is unwrapped)', () => {
    const mockCallback = vi.fn();

    const state = observe(
      {
        values: [1, 2, 3],
      },
      { focusable: true, onChange: mockCallback },
    );
    const { commit } = focus(state);

    const values = derive(() => {
      return state.values;
    });
    commit();

    values.push(4);

    expect(mockCallback).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test('nested derive', () => {
    // The problem:
    // derive a calculates a value, and invokes callback a.
    // derive b calculates a value which includes calling derive a, and invokes callback b.
    // When a change causes derive a to be triggered within derive b (before derive a is triggered on its own), internally
    // that will cause derive a's "remembered" value to change, so when
    // derive a is triggered, it does not recognize that the value has changed so callback a is not triggered.

    const mockCallbackA = vi.fn();

    const data = {
      value1: 1,
      value2: 2,
    };

    const stateA = observe(data, { focusable: true, onChange: mockCallbackA });
    const { commit } = focus(stateA);

    const derive1 = () => {
      return stateA.value1;
    };

    // derive b
    derive(() => {
      void derive(derive1);
      return stateA.value2;
    });

    // derive a
    derive(derive1);
    commit();

    vi.resetAllMocks();
    stateA.value1 = 3;

    expect(mockCallbackA).toHaveBeenCalledTimes(1);
  });

  test('derive double value', () => {
    const mockCallbackA = vi.fn();

    const data = {
      object1: {
        value1: '',
        value2: '',
      },
    };

    const stateA = observe(data, { focusable: true, onChange: mockCallbackA });
    const { commit } = focus(stateA);
    derive(() => {
      return !!stateA.object1.value1 || !!stateA.object1.value2;
    });
    commit();

    stateA.object1.value1 = 'a';
    stateA.object1.value2 = 'b';
    vi.resetAllMocks();
    atomic(() => {
      stateA.object1.value1 = 'x';
    });
    expect(mockCallbackA).toHaveBeenCalledTimes(0);

    stateA.object1.value1 = 'a';
    stateA.object1.value2 = 'b';
    vi.resetAllMocks();
    stateA.object1.value1 = '';
    expect(mockCallbackA).toHaveBeenCalledTimes(0);

    stateA.object1.value1 = 'a';
    stateA.object1.value2 = 'b';
    vi.resetAllMocks();
    stateA.object1.value2 = '';
    expect(mockCallbackA).toHaveBeenCalledTimes(0);

    stateA.object1.value1 = 'a';
    stateA.object1.value2 = 'b';
    vi.resetAllMocks();
    stateA.object1.value1 = '';
    stateA.object1.value2 = '';
    expect(mockCallbackA).toHaveBeenCalledTimes(1);
  });

  test('deriving an object should trigger if nested property changes', () => {
    const mockCallback = vi.fn();

    const data = createData();
    const state = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(state);

    derive(() => {
      return state.object1;
    });
    commit();

    vi.clearAllMocks();

    state.object1!.value1 = 'new-value';

    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('derive fn side effect: reentrant invokeDeriveCtx updates prevResult correctly', () => {
    // The reentrant case requires that `derive()` is called at the top level (outside any
    // atomic context, so atomicObservations is undefined). When the derive fn modifies a
    // property, it creates a fresh atomic that calls triggerObservations while activeDeriveCtx
    // is still set by the outer derive() call. invokeDeriveCtx(ctxB) is then entered reentrant.
    //
    // Bug in old code: it called activeDeriveCtx.fn() (= ctxA.fn()) instead of ctx.fn()
    // (= ctxB.fn()), and never updated ctxB.prevResult. So the next time stateB.y changes
    // on its own, the comparison uses stale prevResult and may silently skip a callback.

    const callbackB = vi.fn();
    const stateA = observe({ x: 1 }, { focusable: true, onChange: vi.fn() });
    const stateB = observe({ y: 10 }, { focusable: true, onChange: callbackB });

    // ctxB: fires when (y > 5) changes
    const { commit: commitB } = focus(stateB);
    derive(() => stateB.y > 5); // initial call: prevResult = true
    commitB();

    // ctxA: when called at top level, immediately sets stateB.y = 3 as a side effect.
    // Because atomicObservations is undefined here, the proxy set on stateB.y creates a fresh
    // atomic and calls triggerObservations while activeDeriveCtx = ctxA → reentrant ctxB call.
    const { commit: commitA } = focus(stateA);
    derive(() => {
      stateB.y = 3; // side effect on every evaluation; y: 10 → 3 (derive: true → false)
      return stateA.x;
    });
    // After this call, ctxB.prevResult should be false (correctly updated after reentrant call).
    commitA();

    vi.clearAllMocks();

    // stateB.y goes 3 → 8: derive flips back (false → true).
    // Correct: prevResult = false, nextResult = true → changed → callbackB fires.
    // Buggy:   prevResult = true (stale, never updated in reentrant call),
    //          nextResult = true → not changed → callbackB silently skipped.
    stateB.y = 8;
    expect(callbackB).toHaveBeenCalledTimes(1);
  });

  test('deriving an object should return unwrapped value', () => {
    const mockCallback = vi.fn();

    const data = createData();
    const state = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(state);

    const result = derive(() => {
      return state.object1;
    });
    commit();

    expect(result).toBe(unwrap(state.object1));
  });

  test('derive context on a path with an existing unconditional observation leaves it unconditional', () => {
    // Exercises the branch in RootNode.createObservation where activeDeriveCtx is set but the
    // observation already exists and is unconditional — the derive ctx must not be added, because
    // an unconditional observation already covers all changes on that path.
    const mockCallback = vi.fn();
    const state = observe({ value: 1 }, { focusable: true, onChange: mockCallback });

    // First focus session: read value without a derive context (unconditional observation).
    const session1 = focus(state);
    void state.value;
    session1.commit();

    // Second focus session: read the same value inside a derive context.
    // The observation at ['value'] already exists and is unconditional, so the derive
    // context is ignored and the observation stays unconditional.
    const session2 = focus(state);
    derive(() => state.value > 0);
    session2.commit();

    // Should fire unconditionally — not gated on the derive result changing.
    state.value = 2; // derive result still true; unconditional observation fires anyway
    expect(mockCallback).toHaveBeenCalledTimes(1);
    mockCallback.mockReset();

    state.value = 3; // derive result still true; still fires
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });
});
