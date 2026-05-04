import { act, render, screen } from '@testing-library/react';
import { observe } from 'keck';
import { useObserver } from 'keck/react';
import { Suspense, startTransition } from 'react';
import { vi } from 'vitest';

describe('useObserver - Suspense and concurrent features', () => {
  test('Abandoned render does not leave stale observations after recovery', async () => {
    // When a render is abandoned (throws a Promise), useInsertionEffect does not fire and
    // the transaction is never committed. Pending observations from the abandoned render are
    // structurally inert — they never reach _validObservations — so they cannot trigger
    // callbacks. When the component re-renders successfully, beginTransaction() discards the
    // old pending set and starts fresh. Only the committed render's properties are subscribed.
    const rawData = { a: 0, b: 0 };
    const writer = observe(rawData);
    let shouldSuspend = true;
    let resolvePromise!: () => void;
    const suspensePromise = new Promise<void>((res) => {
      resolvePromise = res;
    });
    const mockRender = vi.fn();

    function SuspendingComponent() {
      mockRender();
      const state = useObserver(rawData);
      if (shouldSuspend) {
        void state.a; // read 'a' only in the abandoned render — never committed to _validObservations
        throw suspensePromise;
      }
      return <div data-testid="content">{state.b}</div>; // only reads 'b' when not suspended
    }

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <SuspendingComponent />
      </Suspense>,
    );

    expect(screen.getByText('Loading...')).toBeDefined();
    mockRender.mockClear();

    // Allow the component to render successfully
    shouldSuspend = false;
    await act(async () => {
      resolvePromise();
      await suspensePromise;
    });

    expect(screen.queryByText('Loading...')).toBeNull();
    mockRender.mockClear();

    // After the successful render only 'b' is subscribed — the abandoned 'a' read was never
    // committed to _validObservations and cannot trigger a callback.
    act(() => {
      writer.a = 99;
    });
    expect(mockRender).toHaveBeenCalledTimes(0);

    // 'b' is subscribed and should trigger a re-render.
    act(() => {
      writer.b = 42;
    });
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  test('Pending observations from abandoned render cannot trigger callbacks before recovery', async () => {
    // Structural guarantee: writes to a property read during an abandoned render cannot fire
    // the component's callback while it is still suspended. In the transaction model, those
    // reads are in _pendingObservations, not _validObservations, so hasObservation() returns
    // false and the callback is never invoked — regardless of timing.
    const rawData = { a: 0 };
    const writer = observe(rawData);
    let shouldSuspend = true;
    let resolvePromise!: () => void;
    const suspensePromise = new Promise<void>((res) => {
      resolvePromise = res;
    });
    const mockCallback = vi.fn();

    function SuspendingComponent() {
      const state = useObserver(rawData);
      if (shouldSuspend) {
        void state.a; // read 'a' before throwing — goes to _pendingObservations
        throw suspensePromise;
      }
      return <div>{state.a}</div>;
    }

    function TestApp() {
      mockCallback();
      return (
        <Suspense fallback={<div>Loading...</div>}>
          <SuspendingComponent />
        </Suspense>
      );
    }

    render(<TestApp />);
    mockCallback.mockClear();

    // Write to 'a' while the component is still suspended — pending observation must not fire
    act(() => {
      writer.a = 99;
    });
    expect(mockCallback).not.toHaveBeenCalled();

    // Resolve and allow the successful render
    shouldSuspend = false;
    await act(async () => {
      resolvePromise();
      await suspensePromise;
    });
  });

  test('startTransition renders commit subscriptions for the correct final state', async () => {
    // Verifies that after a startTransition, the component subscribes to the properties
    // that were read in the committed render, not any intermediate render.
    const rawData = { mode: 'a' as 'a' | 'b', a: 0, b: 0 };
    const writer = observe(rawData);
    const mockRender = vi.fn();

    function TestComponent() {
      mockRender();
      const state = useObserver(rawData, []);
      return <div>{state.mode === 'a' ? state.a : state.b}</div>;
    }

    render(<TestComponent />);
    mockRender.mockClear();

    // Transition to mode 'b' — after this, only 'b' (not 'a') should be subscribed
    await act(async () => {
      startTransition(() => {
        writer.mode = 'b';
      });
    });

    mockRender.mockClear();

    // 'a' is no longer read during render — should not trigger re-render
    act(() => {
      writer.a = 99;
    });
    expect(mockRender).toHaveBeenCalledTimes(0);

    // 'b' is now read during render — should trigger re-render
    act(() => {
      writer.b = 42;
    });
    expect(mockRender).toHaveBeenCalledTimes(1);
  });
});
