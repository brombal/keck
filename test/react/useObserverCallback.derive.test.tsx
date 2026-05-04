import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { shallowCompare } from 'keck';
import { useObserver } from 'keck/react';
import { vi } from 'vitest';

describe('useObserverCallback derived', () => {
  test('Callback only fires when derived value changes', async () => {
    const mockRender = vi.fn();
    const mockCallback = vi.fn();
    const data = { value: 0 };

    function TestComponent() {
      mockRender();

      const state = useObserver(
        data,
        {
          derive: (s) => s.value % 2 === 0,
          onChange: (result) => mockCallback(result),
        },
        [],
      );

      return (
        <>
          <button type="button" onClick={() => (state.value += 1)}>
            Add 1
          </button>
          <button type="button" onClick={() => (state.value += 2)}>
            Add 2
          </button>
        </>
      );
    }

    render(<TestComponent />);

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Change to 2 (still even; no callback)
    vi.clearAllMocks();
    await userEvent.click(screen.getByText('Add 2'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Change to 3 (now odd; callback invoked)
    vi.clearAllMocks();
    await userEvent.click(screen.getByText('Add 1'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(false);

    // Change to 5 (still odd; no callback)
    vi.clearAllMocks();
    await userEvent.click(screen.getByText('Add 2'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });

  test('Returned state subscribes render — reads in render trigger re-renders', async () => {
    const mockRender = vi.fn();
    const mockCallback = vi.fn();
    const data = { value: 0 };

    function TestComponent() {
      const state = useObserver(
        data,
        {
          derive: (s) => s.value % 2 === 0,
          onChange: (result) => mockCallback(result),
        },
        [],
      );
      mockRender(state.value);
      return (
        <button type="button" onClick={() => (state.value += 1)}>
          Add 1
        </button>
      );
    }

    render(<TestComponent />);
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenLastCalledWith(0);
    vi.clearAllMocks();

    // value read in render → re-render on change; parity flips → derived callback fires
    await userEvent.click(screen.getByText('Add 1'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenLastCalledWith(1);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenLastCalledWith(false);
    vi.clearAllMocks();

    // parity unchanged → no derived callback, but value still changed so still re-renders
    await userEvent.click(screen.getByText('Add 1'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenLastCalledWith(2);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenLastCalledWith(true);
  });

  test('isEqual prevents onChange from firing when derived value is considered equal', async () => {
    const mockCallback = vi.fn();
    const data = { items: ['a', 'b'] as string[] };

    function TestComponent() {
      const state = useObserver(
        data,
        {
          derive: (s) => [...s.items],
          onChange: (ids) => mockCallback(ids),
          isEqual: shallowCompare,
        },
        [],
      );

      return (
        <>
          <button
            type="button"
            onClick={() => {
              state.items = [...state.items];
            }}
          >
            Replace same
          </button>
          <button
            type="button"
            onClick={() => {
              state.items = [...state.items, 'c'];
            }}
          >
            Add item
          </button>
        </>
      );
    }

    render(<TestComponent />);
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Replace with same contents — shallowCompare returns true, no callback
    vi.clearAllMocks();
    await userEvent.click(screen.getByText('Replace same'));
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Add a new item — shallowCompare returns false, callback fires
    vi.clearAllMocks();
    await userEvent.click(screen.getByText('Add item'));
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(['a', 'b', 'c']);
  });
});
