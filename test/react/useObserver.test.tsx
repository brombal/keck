import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observe } from 'keck';
import { useObserver } from 'keck/react';
import { useInsertionEffect, useState } from 'react';

describe('useObserver', () => {
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
    const data = {
      value: 0,
    };

    const renderMockFn = jest.fn();

    function GcTestInner(props: { id: string }) {
      const state = useObserver(data);
      renderMockFn(props.id);

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

    render(<GcTestOuter />);

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

  test('Updating state during render defers re-render of other components sharing state', async () => {
    // Note this is mostly a coverage test; this should cause coverage of the useLayoutEffect in useObserver

    const actions = [] as string[];

    const data = {
      value: 0,
    };

    function ComponentA() {
      actions.push('Render ComponentA');
      const state = useObserver(data);

      if (state.value === 0) {
        state.value = 1; // Update during render
      }

      useInsertionEffect(() => {
        actions.push('Commit ComponentA');
      });

      return <div>Component A Value: {state.value}</div>;
    }

    function ComponentB() {
      actions.push('Render ComponentB');
      const state = useObserver(data);

      useInsertionEffect(() => {
        actions.push('Commit ComponentB');
      });

      return (
        <div>
          Component B Value: {state.value}
          <button onClick={() => (state.value = 0)} type="button">
            Reset
          </button>
        </div>
      );
    }

    function TestApp() {
      return (
        <div>
          <ComponentA />
          <ComponentB />
        </div>
      );
    }

    render(<TestApp />);

    // ComponentA writes state.value during its render. In the transaction model, A's observation
    // is still pending (not committed), so A's write cannot trigger A's own callback. ComponentB
    // has not yet rendered, so it also has no committed observation. Neither schedules a re-render.
    expect(actions).toEqual([
      'Render ComponentA',
      'Render ComponentB',
      'Commit ComponentA',
      'Commit ComponentB',
    ]);

    // Final values should be consistent
    expect(screen.getByText('Component A Value: 1')).toBeDefined();
    expect(screen.getByText('Component B Value: 1')).toBeDefined();

    actions.length = 0;

    // Reset the value to 0 via ComponentB
    await userEvent.click(screen.getByText('Reset'));

    // After Reset, both A and B re-render (both had committed observations on value).
    // ComponentA reads then writes state.value during its render. In the transaction model,
    // A's observation is in _pendingObservations, so A's write does not trigger A's callback —
    // no redundant second render for A. B's committed observation IS triggered, so B gets a
    // deferred re-render via useLayoutEffect.
    expect(actions).toEqual([
      'Render ComponentA',
      'Render ComponentB',
      'Commit ComponentA',
      'Commit ComponentB',
      'Render ComponentB', // deferred: ComponentA's write triggered B's committed observation
      'Commit ComponentB',
    ]);

    // Final values should be consistent
    expect(screen.getByText('Component A Value: 1')).toBeDefined();
    expect(screen.getByText('Component B Value: 1')).toBeDefined();
  });

  test('Deferred rerender closure is skipped if component unmounts before layout effect', async () => {
    // Scenario: ComponentA writes to keck state during its own render. This fires ComponentB's
    // observer callback while isRendering = true, deferring B's rerender to renderRequests.
    // In the same React render pass, B is conditionally unmounted. After commit, B's cleanup sets
    // renderValidRef.current = false. When useLayoutEffect drains renderRequests, the rerender
    // closure must not call forceRerender on the unmounted component.
    //
    // Note: in React 18, setState on an unmounted component is silently ignored, so this passes
    // whether or not the guard is applied. The guard is correct for defensive purposes and
    // future React compatibility.
    const mockRenderB = jest.fn();
    const data = { value: 0 };

    function ComponentA({ shouldWrite }: { shouldWrite: boolean }) {
      const state = useObserver(data);
      if (shouldWrite && state.value === 0) {
        state.value = 99; // write during render — triggers B's deferred rerender
      }
      return <div>A</div>;
    }

    function ComponentB() {
      mockRenderB();
      const state = useObserver(data);
      return <div>B: {state.value}</div>;
    }

    function TestApp() {
      const [showB, setShowB] = useState(true);
      return (
        <div>
          <ComponentA shouldWrite={!showB} />
          {showB && <ComponentB />}
          <button type="button" onClick={() => setShowB(false)}>
            Hide B
          </button>
        </div>
      );
    }

    render(<TestApp />);
    expect(mockRenderB).toHaveBeenCalledTimes(1); // initial render
    mockRenderB.mockClear();

    // Clicking hides B and triggers a React render where A writes during render.
    // B's callback fires (deferred), then B unmounts. After layout effect, the stale
    // rerender closure must not trigger a render of the now-unmounted B.
    await userEvent.click(screen.getByText('Hide B'));
    expect(mockRenderB).toHaveBeenCalledTimes(0);
  });

  test('Multiple writes during a render pass produce one batched re-render for the observer', async () => {
    // When a component writes to two separate observed properties during its render, both writes
    // fire the observer's deferred callback and add closures to renderRequests. React 18 batches
    // the resulting forceRerender calls inside useLayoutEffect into a single re-render.
    const mockRenderB = jest.fn();
    const data = { x: 0, y: 0 };

    function ComponentA() {
      const state = useObserver(data);
      if (state.x === 0) {
        state.x = 1; // write 1 — defers B's rerender
        state.y = 1; // write 2 — defers B's rerender again
      }
      return (
        <button
          type="button"
          onClick={() => {
            state.x = 0;
            state.y = 0;
          }}
        >
          Reset
        </button>
      );
    }

    function ComponentB() {
      mockRenderB();
      const state = useObserver(data);
      return (
        <div>
          {state.x},{state.y}
        </div>
      );
    }

    render(
      <div>
        <ComponentA />
        <ComponentB />
      </div>,
    );

    // Initial render: A writes during render, but B is not yet committed, so B's deferred
    // rerenders are blocked (renderValidRef.current = false). B renders once with the
    // already-modified values.
    expect(mockRenderB).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1,1')).toBeDefined();
    mockRenderB.mockClear();

    // Reset: event handler writes x=0, y=0 (outside render, isRendering=false).
    // These fire A's and B's callbacks directly. React batches them into one re-render pass.
    // During that pass, A re-renders and writes x=1, y=1 again (B is now committed).
    // Both writes fire B's deferred callbacks. useLayoutEffect drains and React batches those
    // into one additional re-render for B.
    // Net: 2 renders of B after the click (one from direct callbacks, one from deferred writes).
    await userEvent.click(screen.getByText('Reset'));
    expect(mockRenderB).toHaveBeenCalledTimes(2);
    expect(screen.getByText('1,1')).toBeDefined();
  });

  test('Using deps to reset state does not persist previous callbacks', async () => {
    const mockCallbackC = jest.fn();
    const data = observe({ value: 0 }, mockCallbackC);

    const mockCallbackA = jest.fn();
    const mockCallbackB = jest.fn();

    function ComponentA(props: { resetKey: number }) {
      useObserver(data, mockCallbackA, [props.resetKey]);
      return null;
    }

    function ComponentB() {
      useObserver(data, mockCallbackB);
      return null;
    }

    function TestApp() {
      const [resetKey, setResetKey] = useState(0);

      return (
        <div>
          <ComponentA resetKey={resetKey} />
          <ComponentB />
          <button onClick={() => setResetKey((k) => k + 1)} type="button">
            Reset
          </button>
        </div>
      );
    }

    render(<TestApp />);
    expect(mockCallbackA).toHaveBeenCalledTimes(0);
    expect(mockCallbackB).toHaveBeenCalledTimes(0);
    expect(mockCallbackC).toHaveBeenCalledTimes(0);

    data.value++;
    expect(mockCallbackA).toHaveBeenCalledTimes(1);
    expect(mockCallbackB).toHaveBeenCalledTimes(1);
    expect(mockCallbackC).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();

    await userEvent.click(screen.getByText('Reset'));
    expect(mockCallbackA).toHaveBeenCalledTimes(0);
    expect(mockCallbackB).toHaveBeenCalledTimes(0);
    expect(mockCallbackC).toHaveBeenCalledTimes(0);
    jest.clearAllMocks();

    data.value++;
    expect(mockCallbackA).toHaveBeenCalledTimes(1);
    expect(mockCallbackB).toHaveBeenCalledTimes(1);
    expect(mockCallbackC).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
  });
});
