import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRefWithDeps } from 'keck/react/useRefWithDeps';
import { useState } from 'react';

describe('useRefWithDeps', () => {
  test('ref value is recreated when deps change', async () => {
    const mockRender = jest.fn();

    const object1 = {};
    const object2 = {};

    function TestComponent() {
      const [, forceRerender] = useState({});
      const [dep, setDep] = useState(1);
      const value = useRefWithDeps(() => (dep === 1 ? object1 : object2), [dep]);
      mockRender(value.current);
      return (
        <>
          <button type="button" onClick={() => forceRerender({})}>
            rerender
          </button>
          <button type="button" onClick={() => setDep(2)}>
            +1
          </button>
        </>
      );
    }

    render(<TestComponent />);
    expect(mockRender).toHaveBeenCalledWith(object1);
    jest.clearAllMocks();

    await userEvent.click(screen.getByText('rerender'));
    expect(mockRender).toHaveBeenCalledWith(object1);
    jest.clearAllMocks();

    await userEvent.click(screen.getByText('+1'));
    expect(mockRender).toHaveBeenCalledWith(object2);
    jest.clearAllMocks();
  });
});
