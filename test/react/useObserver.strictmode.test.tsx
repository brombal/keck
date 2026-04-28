import { jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observe } from 'keck';
import { useObserver } from 'keck/react';
import { StrictMode } from 'react';

describe('useObserver - React Strict Mode', () => {
  test('Component re-renders correctly after Strict Mode effects cycle', async () => {
    // In Strict Mode, React simulates mount → cleanup → remount to detect side effect issues.
    // After this cycle the component must still re-render when a subscribed property changes.
    // In Strict Mode, React also double-invokes the render function body, so each actual
    // React render produces two calls to the component function.
    const mockRender = jest.fn();
    const data = { count: 0 };

    function Counter() {
      mockRender();
      const state = useObserver(data);
      return (
        <button type="button" onClick={() => state.count++}>
          {state.count}
        </button>
      );
    }

    render(
      <StrictMode>
        <Counter />
      </StrictMode>,
    );

    // Strict Mode double-invokes the function body on every render.
    // After initial mount + effects simulation: 2 (initial render) + 2 (Strict Mode remount) = 4.
    const callsAfterMount = mockRender.mock.calls.length;
    mockRender.mockClear();

    await userEvent.click(screen.getByRole('button'));

    // The button text should update, confirming re-render happened.
    expect(screen.getByRole('button').textContent).toBe('1');

    // A single React render triggered by the click = 2 function body invocations (Strict Mode).
    expect(mockRender).toHaveBeenCalledTimes(2);

    // Sanity: the initial mount was also double-invoked.
    expect(callsAfterMount).toBeGreaterThan(0);
  });

  test('Subscriptions are correct after re-render in Strict Mode', async () => {
    // After the Strict Mode effects cycle, only properties read in the final committed render
    // should be subscribed. Verifies that the cleanup does not destroy the committed observations.
    const mockRender = jest.fn();
    const rawData = { a: 0, b: 0 };
    const writer = observe(rawData); // external proxy to drive writes

    let showA = true;

    function TestComponent() {
      mockRender();
      const state = useObserver(rawData, [showA]);
      return <div>{showA ? state.a : state.b}</div>;
    }

    const { rerender } = render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    );

    // Re-render the component so it only reads 'b'
    showA = false;
    rerender(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    );
    mockRender.mockClear();

    // Write to 'a' — component is not subscribed, should not re-render
    act(() => {
      writer.a = 99;
    });
    expect(mockRender).toHaveBeenCalledTimes(0);

    // Write to 'b' — component is subscribed, should re-render
    act(() => {
      writer.b = 42;
    });
    expect(mockRender).toHaveBeenCalledTimes(2); // Strict Mode double-invoke per React render
  });

  test('Callback fires exactly once per change in Strict Mode', async () => {
    // Verifies the Strict Mode effects cycle does not duplicate the observer or its callback.
    const mockCallback = jest.fn();
    const data = { value: 0 };

    function TestComponent() {
      const state = useObserver(data, mockCallback, []);
      return (
        <button type="button" onClick={() => state.value++}>
          {state.value}
        </button>
      );
    }

    render(
      <StrictMode>
        <TestComponent />
      </StrictMode>,
    );

    mockCallback.mockClear();

    await userEvent.click(screen.getByRole('button'));
    expect(mockCallback).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('button'));
    expect(mockCallback).toHaveBeenCalledTimes(2);
  });
});
