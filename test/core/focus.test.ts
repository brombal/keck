import { focus, observe } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

describe('focus()', () => {
  test('Modifying focused properties triggers callback', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);

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

    commit1();
    commit2();

    store1.object1.value1 = 'new-object1-value1';
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    store1.object1.value2 = 'new-object1-value2';
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();

    delete store1.object1.value3;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    store1.object2.value1 = 'new-object2-value1';
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    mockFn1.mockReset();
    mockFn2.mockReset();

    // No modification
    store1.object1.value1 = 'new-object1-value1';
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();

    // Not focused
    store1.object2.value2 = 'new-object2-value2';
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    mockFn1.mockReset();
    mockFn2.mockReset();
  });

  test('Capturing object reference and modifying it does not trigger callback', () => {
    const data = createData();

    const mockCallback = vi.fn();
    const store = observe(data, { focusable: true, onChange: mockCallback });
    const { commit } = focus(store);

    void store.object1;
    commit();

    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.object1 = {
      value1: 'new-object1-value1',
      value2: 'new-object1-value2',
    } as any;

    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Replacing ancestor of focused property triggers callback', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);

    void store1.object1.value1;
    void store2.object1.value1;
    commit1();
    commit2();

    store1.object1 = {
      value1: 'new-object1-value1',
      value2: 'new-object1-value2',
    } as any;

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test('Properties accessed outside a session do not trigger callback', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);
    void store1.value1;
    void store1.value3;
    commit1();

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);
    void store2.value1;
    commit2();

    // Accessed outside a session — not observed
    void store1.value2;
    void store2.value2;
    void store2.value3;

    store1.value1 = 'new-value1';
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    store1.value2 = 1;
    expect(mockFn1).toHaveBeenCalledTimes(0);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();

    store1.value3 = false;
    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(0);
    vi.clearAllMocks();
  });

  test('commit without a prior focus session is a no-op', () => {
    const store = observe({ value: 1 }, { focusable: true, onChange: vi.fn() });
    const { commit } = focus(store);
    const { discard } = focus(store); // supersedes previous — first is auto-discarded
    discard();
    expect(() => commit()).not.toThrow();
  });

  test('commit makes pending observations live', () => {
    const mockCallback = vi.fn();
    const store = observe({ value: 1 }, { focusable: true, onChange: mockCallback });

    const { commit } = focus(store);
    void store.value;
    commit();

    store.value = 2;
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('discard is a no-op when already settled', () => {
    const store = observe({ value: 1 }, { focusable: true, onChange: vi.fn() });
    const { discard } = focus(store);
    discard();
    expect(() => discard()).not.toThrow();
  });

  test('abandoned session does not destroy committed observations', () => {
    const mockCallback = vi.fn();
    const store = observe({ value: 1 }, { focusable: true, onChange: mockCallback });

    const { commit } = focus(store);
    void store.value;
    commit();

    const { discard } = focus(store);
    void store.value;
    discard();

    store.value = 2;
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('auto-discard via microtask restores observations', async () => {
    const mockCallback = vi.fn();
    const store = observe({ value: 1 }, { focusable: true, onChange: mockCallback });

    const { commit } = focus(store);
    void store.value;
    commit();

    focus(store); // abandoned — no commit or discard called
    void store.value;

    await Promise.resolve(); // flush microtask

    store.value = 2;
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('starting a new session settles the prior one', () => {
    const store = observe({ value: 1 }, { focusable: true, onChange: vi.fn() });

    const { commit } = focus(store);
    void store.value;
    commit();

    focus(store); // session1 — abandoned
    void store.value;

    focus(store); // session2 — supersedes session1, which is discarded immediately
    void store.value;

    expect(() => store.value).not.toThrow();
  });

  test('focus() throws on non-focusable observer', () => {
    const store = observe({ value: 1 }, vi.fn());
    expect(() => focus(store)).toThrow('focusable observer');
  });
});
