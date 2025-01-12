import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDerived, useObserver } from 'keck/react';
import { useState } from 'react';

describe('React', () => {
  test('Component only re-renders when accessed properties are modified', async () => {
    const mockRender = jest.fn();
    const data = {
      value: 0,
    };

    function ObserverTest() {
      mockRender();

      const store = useObserver(data);

      const [showValue, setShowValue] = useState(true);

      return (
        <div>
          {showValue && <div>{store.value}</div>}

          <input
            type="checkbox"
            checked={showValue}
            onChange={() => {
              setShowValue((s) => !s);
            }}
          />

          <button onClick={() => store.value++} type="button">
            +1
          </button>
        </div>
      );
    }

    render(<ObserverTest />);

    jest.clearAllMocks();

    // Checkbox is visible; click button; expect render count to be 1
    await userEvent.click(screen.getByText('+1'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    // Hide value; click button; expect render count to be 0
    await userEvent.click(screen.getByRole('checkbox'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    await userEvent.click(screen.getByText('+1'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    // Show value; click button; expect render count to be 1
    await userEvent.click(screen.getByRole('checkbox'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    await userEvent.click(screen.getByText('+1'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
  });

  test('Component only re-renders when useDerived result changes', async () => {
    const mockRender = jest.fn();
    const data = {
      value: 0,
    };

    function IsEven() {
      mockRender();

      const state = useObserver(data);
      const isEven = useDerived(data, (state) => {
        return state.value % 2 === 0;
      });

      return (
        <div>
          {isEven && 'even!'}
          <button onClick={() => state.value++} type="button">
            +1
          </button>
          <button onClick={() => (state.value += 2)} type="button">
            +2
          </button>
        </div>
      );
    }

    render(<IsEven />);

    jest.clearAllMocks();

    // Click +1 button (change to evenness); expect render count to be 1
    await userEvent.click(screen.getByText('+1'));
    // Value is now 1; expect render count to be 1
    expect(mockRender).toHaveBeenCalledTimes(1);
    jest.resetAllMocks();

    // Click +2 button (no change to evenness); expect render count to be 0
    await userEvent.click(screen.getByText('+2'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    // Click +1 button (change to evenness); expect render count to be 1
    await userEvent.click(screen.getByText('+1'));
    expect(mockRender).toHaveBeenCalledTimes(1);
    jest.resetAllMocks();
  });
});
