import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useObserver } from 'keck/react';
import { useState } from 'react';

describe('useObserverCallback', () => {
  test('Callback fires when any value changes', async () => {
    const mockRender = jest.fn();
    const mockCallback = jest.fn();
    const data = { value: 0 };

    function TestComponent() {
      mockRender();

      const state = useObserver(data, () => {
        mockCallback();
      }, []);

      return (
        <button type="button" onClick={() => (state.value += 1)}>
          Add 1
        </button>
      );
    }

    render(<TestComponent />);

    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockCallback).toHaveBeenCalledTimes(0);

    // Change value; callback invoked but no re-render
    jest.clearAllMocks();
    await userEvent.click(screen.getByText('Add 1'));
    expect(mockRender).toHaveBeenCalledTimes(0);
    expect(mockCallback).toHaveBeenCalledTimes(1);
  });

  test('Returned state subscribes render — reads in render trigger re-renders', async () => {
    const mockRender = jest.fn();
    const mockCallback = jest.fn();
    const data = { value: 0, other: 'x' };

    function TestComponent() {
      const state = useObserver(data, () => mockCallback(), []);
      mockRender(state.value);
      return (
        <>
          <button type="button" onClick={() => (state.value += 1)}>
            Add 1
          </button>
          <button type="button" onClick={() => (state.other = 'y')}>
            Change other
          </button>
        </>
      );
    }

    render(<TestComponent />);
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenLastCalledWith(0);
    jest.clearAllMocks();

    // Mutating a property that was read in render triggers a re-render
    // AND fires the sync callback.
    await userEvent.click(screen.getByText('Add 1'));
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenLastCalledWith(1);
    jest.clearAllMocks();

    // Mutating a property that was NOT read in render fires the callback
    // but does not trigger a re-render.
    await userEvent.click(screen.getByText('Change other'));
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(0);
  });

  test('Returned value re-initializes when deps change', async () => {
    const mockRender = jest.fn();

    const objectRefs = [] as any[];

    function TestComponent() {
      const [dep, setDep] = useState(0);
      const [value, setValue] = useState(0);

      const state = useObserver({ value }, () => {}, [dep]);
      objectRefs.push(state);

      mockRender({ stateValue: value, observerValue: state.value });

      return (
        <>
          <button type="button" onClick={() => setValue(value + 1)}>
            Add 1
          </button>
          <button type="button" onClick={() => setDep(dep + 1)}>
            Change dep
          </button>
        </>
      );
    }

    render(<TestComponent />);

    expect(mockRender).toHaveBeenCalledWith({ stateValue: 0, observerValue: 0 });
    jest.clearAllMocks();

    await userEvent.click(screen.getByText('Add 1'));
    expect(mockRender).toHaveBeenCalledWith({ stateValue: 1, observerValue: 0 });
    expect(objectRefs[0]).toBe(objectRefs[1]); // Same object
    jest.clearAllMocks();

    await userEvent.click(screen.getByText('Change dep'));
    expect(mockRender).toHaveBeenCalledWith({ stateValue: 1, observerValue: 1 });
    expect(objectRefs[0]).toBe(objectRefs[1]); // Same object
    expect(objectRefs[1]).not.toBe(objectRefs[2]); // Different object
  });
});
