import { act, render, screen } from '@testing-library/react';
import { observe } from 'keck';
import { useObserver } from 'keck/react';
import { startTransition } from 'react';

describe('useObserver - concurrent mode safety', () => {
  test('sibling components see consistent state after a transition', async () => {
    // Both components read the same observable property. After a state change via startTransition,
    // both must reflect the same updated value — no tearing where one shows old and one shows new.
    const rawData = { value: 1 };
    const writer = observe(rawData);

    function ComponentA() {
      const s = useObserver(rawData);
      return <div data-testid="a">{s.value}</div>;
    }

    function ComponentB() {
      const s = useObserver(rawData);
      return <div data-testid="b">{s.value}</div>;
    }

    render(
      <>
        <ComponentA />
        <ComponentB />
      </>,
    );

    expect(screen.getByTestId('a').textContent).toBe('1');
    expect(screen.getByTestId('b').textContent).toBe('1');

    act(() => {
      startTransition(() => {
        writer.value = 2;
      });
    });

    // Both components must show the same new value — no tearing.
    expect(screen.getByTestId('a').textContent).toBe('2');
    expect(screen.getByTestId('b').textContent).toBe('2');
  });

  test('multiple sequential transitions always produce consistent state', async () => {
    // Rapid successive transitions must not leave either component stranded on a stale value.
    const rawData = { count: 0 };
    const writer = observe(rawData);

    function Counter({ name }: { name: string }) {
      const s = useObserver(rawData);
      return <div data-testid={name}>{s.count}</div>;
    }

    render(
      <>
        <Counter name="x" />
        <Counter name="y" />
      </>,
    );

    for (let i = 1; i <= 5; i++) {
      act(() => {
        startTransition(() => {
          writer.count = i;
        });
      });
    }

    expect(screen.getByTestId('x').textContent).toBe('5');
    expect(screen.getByTestId('y').textContent).toBe('5');
  });

  test('parent and child both read the same observable consistently', async () => {
    // A parent/child tree reading the same observable must not tear across the tree.
    const rawData = { status: 'idle' };
    const writer = observe(rawData);

    function Child() {
      const s = useObserver(rawData);
      return <span data-testid="child">{s.status}</span>;
    }

    function Parent() {
      const s = useObserver(rawData);
      return (
        <div data-testid="parent">
          {s.status}
          <Child />
        </div>
      );
    }

    render(<Parent />);

    expect(screen.getByTestId('parent').textContent).toBe('idleidle');
    expect(screen.getByTestId('child').textContent).toBe('idle');

    act(() => {
      startTransition(() => {
        writer.status = 'active';
      });
    });

    expect(screen.getByTestId('parent').textContent).toBe('activeactive');
    expect(screen.getByTestId('child').textContent).toBe('active');
  });
});
