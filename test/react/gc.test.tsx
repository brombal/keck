import { render } from '@testing-library/react';
import { initGarbageCollectionObservation } from 'keck';
import { useObserver } from 'keck/react';
import { vi } from 'vitest';

const data = { value: 1 };

describe('useObserver garbage collection', () => {
  const unsubs: Array<() => void> = [];
  afterEach(() => {
    unsubs.splice(0).forEach((u) => void u());
  });

  test("callback fires when useObserver component unmounts and is GC'd", async () => {
    const gcCallback = vi.fn();
    unsubs.push(initGarbageCollectionObservation(gcCallback));

    function Component() {
      const state = useObserver(data);
      return <>{state.value}</>;
    }

    const { unmount } = render(<Component />);
    unmount();

    await new Promise((resolve) => setTimeout(resolve, 50));
    global.gc!();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(gcCallback).toHaveBeenCalledWith('Keck observable released');
  });
});
