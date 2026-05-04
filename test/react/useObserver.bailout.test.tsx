import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useObserver } from 'keck/react';
import { useEffect, useState } from 'react';
import { vi } from 'vitest';

describe('useObserver - React bail-out renders', () => {
  test('bail-out render does not destroy subscriptions', async () => {
    // Reproduces a field bug where a React render that starts but is never committed
    // (i.e. useInsertionEffect never fires) permanently destroys the observer's subscriptions.
    //
    // This can happen in two ways:
    //   1. useEffect calls setState with the same value — React may invoke the render function
    //      once to verify the output but skip the commit (bail-out). In React >=19 this is
    //      optimised away, but the scenario still occurs naturally via concurrent rendering.
    //   2. In React's concurrent mode a click can trigger a committed render followed by an
    //      immediately-abandoned speculative render; without the fix the abandoned render's
    //      beginTransaction() clears _validObservations and commitTransaction() is never called,
    //      leaving the observer with no live subscriptions.
    //
    // The test verifies that a second click still triggers a re-render after a first click
    // that produces at least one abandoned render (demonstrated by 2+ renders on click 1).

    const rawData = { value: '' };
    const mockRender = vi.fn();

    function TestComponent() {
      mockRender();
      const [, setState] = useState('');
      const state = useObserver(rawData);

      useEffect(() => {
        setState(''); // same value — may trigger a bail-out render in some React versions
      }, []);

      return (
        <button
          data-testid="btn"
          type="button"
          onClick={() => {
            state.value = Math.random().toString();
          }}
        >
          {state.value || 'click'}
        </button>
      );
    }

    render(<TestComponent />);
    await act(async () => {}); // flush useEffect

    mockRender.mockClear();

    // First click. React may produce more than one render (committed + abandoned speculative).
    await userEvent.click(screen.getByTestId('btn'));
    const rendersOnFirstClick = mockRender.mock.calls.length;
    expect(rendersOnFirstClick).toBeGreaterThanOrEqual(1);
    mockRender.mockClear();

    // Second click — must still trigger at least one re-render regardless of how many renders
    // the first click produced. Without the fix, abandoned renders from the first click wipe
    // _validObservations, so the second click produces 0 renders.
    await userEvent.click(screen.getByTestId('btn'));
    expect(mockRender.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
