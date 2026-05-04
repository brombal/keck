import { atomic, focus, observe } from 'keck';
import { vi } from 'vitest';
import { createData } from '../shared-data';

// Type-level tests
{
  // Return type is inferred from fn
  const result = atomic(() => 42);
  result satisfies number;

  // Args and fn parameter types must match
  atomic((x: number) => x, [1]);
  // @ts-expect-error — string is not assignable to number
  atomic((x: number) => x, ['hello']);

  // Passing args when fn takes none is an error
  // @ts-expect-error — fn takes no parameters but args are provided
  atomic(() => 0, [1]);
}

describe('atomic()', () => {
  test('Atomic modifications only trigger callback once (non-focus mode)', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, mockFn1);

    const mockFn2 = vi.fn();
    const _store2 = observe(data, mockFn2);

    atomic(() => {
      store1.object1.value1 = 'new-value1';
      store1.object2.value1 = 'new-value1';
    });

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test('Atomic modifications only trigger callback once (focused mode)', () => {
    const data = createData();

    const mockFn1 = vi.fn();
    const store1 = observe(data, { focusable: true, onChange: mockFn1 });
    const { commit: commit1 } = focus(store1);
    void store1.object1.value1;
    void store1.object1.value2;
    commit1();

    const mockFn2 = vi.fn();
    const store2 = observe(data, { focusable: true, onChange: mockFn2 });
    const { commit: commit2 } = focus(store2);
    void store2.object1.value1;
    void store2.object2.value1;
    commit2();

    atomic(() => {
      store1.object1.value1 = 'new-value1';
      store1.object1.value2 = 'new-value1';
      store1.object2.value1 = 'new-value1';
    });

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });

  test('atomic() returns the function result', () => {
    expect(atomic(() => 'hi')).toBe('hi');
  });

  test('atomic() propagates synchronous errors', () => {
    expect(() =>
      atomic(() => {
        throw new Error('x');
      }),
    ).toThrow('x');
  });

  test('atomic() throws when called with an async function', () => {
    expect(() => atomic(async () => {})).toThrow();
  });

  test('atomic() throws when the function returns a Promise', () => {
    expect(() => atomic(() => Promise.resolve(1))).toThrow();
  });

  test('Mutating during a callback that was triggered while inside atomic still triggers', () => {
    const data1 = { value1: 0 };
    const data2 = { value2: 0 };

    const mockFn1 = vi.fn();
    const mockFn2 = vi.fn();

    const store1 = observe(data1, () => {
      store2.value2++;
      mockFn1();
    });
    const store2 = observe(data2, () => {
      mockFn2();
    });

    store1.value1++;

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
    vi.clearAllMocks();

    atomic(() => {
      store1.value1++;
    });

    expect(mockFn1).toHaveBeenCalledTimes(1);
    expect(mockFn2).toHaveBeenCalledTimes(1);
  });
});
