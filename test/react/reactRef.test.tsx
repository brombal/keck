import { render, screen } from '@testing-library/react';
import { reactRef, useObserver } from 'keck/react';

describe('reactRef', () => {
  test('stores and retrieves a DOM element via ref callback', () => {
    const data = {
      elementRef: reactRef<HTMLDivElement>(),
    };

    function Component() {
      const state = useObserver(data);
      return <div ref={state.elementRef} data-testid="test-div" />;
    }

    render(<Component />);

    const el = screen.getByTestId('test-div');
    expect(data.elementRef.current).toBe(el);
  });

  test('current getter returns null before ref is attached', () => {
    const r = reactRef<HTMLDivElement>();
    expect(r.current).toBeNull();
  });

  test('current setter stores value without wrapping it in a proxy', () => {
    const r = reactRef<HTMLDivElement>();
    const el = document.createElement('div');
    r.current = el;
    expect(r.current).toBe(el);
  });
});
