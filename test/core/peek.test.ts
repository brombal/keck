import { focus, observe, peek } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

describe('peek()', () => {
  test('Modifying property that was peeked does not trigger callback', () => {
    const data = createData();

    const mockCallback1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockCallback1 });
    const { commit: commit1 } = focus(store1);
    peek(() => store1.value1);
    void store1.value2;
    peek(() => store1.value3);
    commit1();

    const mockCallback2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockCallback2 });
    const { commit: commit2 } = focus(store2);
    peek(() => store2.value1);
    peek(() => store2.value2);
    void store2.value3;
    commit2();

    // value1 peeked by both store; no callback triggered
    store1.value1 = 'new-value1';
    expect(mockCallback1).toHaveBeenCalledTimes(0);
    vi.resetAllMocks();

    // value2 peeked by store2 but observed by store1; callback triggered once
    store1.value2 = 1;
    expect(mockCallback1).toHaveBeenCalledTimes(1);
    vi.resetAllMocks();

    // value3 peeked by store1 but observed by store2; callback triggered once
    store1.value3 = false;
    expect(mockCallback2).toHaveBeenCalledTimes(1);
    vi.resetAllMocks();
  });
});
