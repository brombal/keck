import { jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
import { observe } from 'keck';
import { useObserver } from 'keck/react';
import { Component, type ReactNode } from 'react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? <div>error fallback</div> : this.props.children;
  }
}

describe('useObserver - error boundary', () => {
  let consoleError: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test('keck re-renders work normally after a sibling component throws during render', async () => {
    // A component that throws synchronously abandons its render. useInsertionEffect never fires,
    // so queueMicrotask is the only mechanism resetting isRendering = false. Once that runs,
    // writes should trigger immediate re-renders in other components — not be deferred.
    const rawData = { value: 0 };
    const writer = observe(rawData);
    const mockRender = jest.fn();

    function ThrowingComponent(): ReactNode {
      useObserver(rawData);
      throw new Error('deliberate test error');
    }

    function WorkingComponent() {
      mockRender();
      const state = useObserver(rawData);
      return <div data-testid="value">{state.value}</div>;
    }

    render(
      <>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
        <WorkingComponent />
      </>,
    );

    mockRender.mockClear();

    // Let microtasks run so isRendering is fully reset after the abandoned render.
    await act(async () => {
      await Promise.resolve();
    });

    // keck writes should still trigger re-renders normally.
    act(() => {
      writer.value = 42;
    });

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('value').textContent).toBe('42');
  });

  test('pending observations from an error-abandoned render cannot trigger callbacks', async () => {
    // When a component throws during render, its observations are still in _pendingObservations
    // (never committed to _validObservations). Writes to those properties must not fire the
    // component's observer callback — same structural guarantee as the Suspense case.
    const rawData = { a: 0 };
    const writer = observe(rawData);
    const mockCallback = jest.fn();

    function ThrowingComponent(): ReactNode {
      const state = useObserver(rawData);
      void state.a; // read 'a' before throwing — goes to _pendingObservations
      throw new Error('deliberate test error');
    }

    function TestApp() {
      mockCallback();
      return (
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
    }

    render(<TestApp />);
    mockCallback.mockClear();

    // Write to 'a' — the pending observation must not fire any callback.
    await act(async () => {
      writer.a = 99;
      await Promise.resolve(); // allow microtasks
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });
});
