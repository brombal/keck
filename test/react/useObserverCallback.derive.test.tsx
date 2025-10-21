import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useObserver } from 'keck/react';

describe('useObserverCallback derived', () => {
  test('Callback only fires when derived value changes', async () => {
    const mockRender = jest.fn();
    const mockCallback = jest.fn();
    const data = { value: 0 };

    function TestComponent() {
      mockRender();

      const state = useObserver(
        data,
        (s) => s.value % 2 === 0,
        (result) => mockCallback(result),
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

    // Change to 2 (still event; no callback)
    jest.clearAllMocks();
    await userEvent.click(screen.getByText('Add 2'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Change to 3 (now odd; callback invoked)
    jest.clearAllMocks();
    await userEvent.click(screen.getByText('Add 1'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledWith(false);

    // Change to 5 (still odd; no callback)
    jest.clearAllMocks();
    await userEvent.click(screen.getByText('Add 2'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(0);
  });
});
