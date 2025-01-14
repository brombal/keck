import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDerived, useObserver } from 'keck/react';
import { StrictMode, useEffect, useRef, useState } from "react";

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

  test('Garbage collector is called when component unmounts', async () => {
    const data = {
      value: 0,
    };

    const mockCleanupFn = jest.fn();
    const r = new FinalizationRegistry(mockCleanupFn);

    function GcTestInner() {
      const state = useObserver(data);
      r.register(state, 'value');

      return (
        <div>
          <span data-testid="store-value">{state.value}</span>

          <button onClick={() => state.value++} type="button">
            +1
          </button>
        </div>
      );
    }

    function GcTestOuter() {
      const [showValue, setShowValue] = useState(true);

      return (
        <div>
          {showValue && <GcTestInner />}

          <button onClick={() => setShowValue(!showValue)} type="button">
            Toggle
          </button>
        </div>
      );
    }

    render(<GcTestOuter />);

    // Click the +1 button
    await userEvent.click(screen.getByText('+1'));
    await userEvent.click(screen.getByText('+1'));

    // Check the value
    // expect(screen.getByTestId('store-value').textContent).toBe('2');

    // Click the toggle button
    await userEvent.click(screen.getByText('Toggle'));

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Expect the cleanup function to be called
    expect(mockCleanupFn).toHaveBeenCalledTimes(3);

    jest.clearAllMocks();
  });

  test('Component does not try to re-render after unmount', async () => {
    (window as any).KECK_OBSERVE_GC = true;

    const data = {
      value: 0,
    };

    const renderMockFn = jest.fn();

    function GcTestInner(props: { id: string }) {
      const state = useObserver(data, () => {
        renderMockFn(props.id);
      });

      return (
        <div>
          <span data-testid={`store-value-${props.id}`}>{state.value}</span>

          <button
            onClick={() => state.value++}
            type="button"
            data-testid={`store-button-${props.id}`}
          >
            +1
          </button>
        </div>
      );
    }

    function GcTestOuter() {
      const [showValue, setShowValue] = useState(true);

      return (
        <div>
          {showValue && <GcTestInner id="1" />}
          <GcTestInner id="2" />

          <button onClick={() => setShowValue(!showValue)} type="button">
            Toggle
          </button>
        </div>
      );
    }

    render(
        <GcTestOuter />,
    );

    // Click the +1 button
    await userEvent.click(screen.getByTestId('store-button-1'));

    // Check the value
    expect(screen.getByTestId('store-value-1').textContent).toBe('1');
    expect(screen.getByTestId('store-value-2').textContent).toBe('1');

    // Click the +1 button
    await userEvent.click(screen.getByTestId('store-button-2'));

    // Check the value
    expect(screen.getByTestId('store-value-1').textContent).toBe('2');
    expect(screen.getByTestId('store-value-2').textContent).toBe('2');

    // Click the toggle button
    await userEvent.click(screen.getByText('Toggle'));
    jest.resetAllMocks();

    // Click the +1 button
    await userEvent.click(screen.getByTestId('store-button-2'));

    // Expect the render function to be called only for the second component
    expect(renderMockFn).toHaveBeenCalledTimes(1);
    expect(renderMockFn).toHaveBeenCalledWith('2');
  });
});
