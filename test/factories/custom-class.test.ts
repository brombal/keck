import { jest } from '@jest/globals';
import { focus, observe, peek, registerClass } from 'keck';

describe('Custom classes', () => {
  class Counter {
    private _value = 0;

    _innerCounter: Counter | undefined;

    get innerCounter() {
      if (!this._innerCounter) this._innerCounter = new Counter();
      return this._innerCounter;
    }

    get value() {
      return this._value;
    }

    get doubleValue() {
      return this._value * 2;
    }

    set value(value: number) {
      this._value = value;
    }

    // Increase value by n, performed in a loop to test atomic behavior
    increase(n: number) {
      for (let i = 0; i < n; i++) {
        this._value++;
      }
    }

    // Increase by n, performed in an async loop to test atomic behavior for async methods
    async increaseAsync(n: number) {
      for (let i = 0; i < n; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        this._value++;
      }
    }
  }

  registerClass(Counter);

  test('Method that modifies its own property does so atomically', async () => {
    const mockCallback = jest.fn();
    const store = observe(new Counter(), mockCallback);

    // Call method that modifies property atomically
    store.increase(2);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(store.value).toBe(2);
    jest.resetAllMocks();
  });

  test('Async modifications are not atomic', async () => {
    const mockCallback = jest.fn();
    const store = observe(new Counter(), mockCallback);

    // Async method is not atomic
    await store.increaseAsync(3);
    expect(mockCallback).toHaveBeenCalledTimes(3);
    expect(store.value).toBe(3);
    jest.resetAllMocks();
  });

  test('Getter and setter works as expected', async () => {
    const mockCallback = jest.fn();
    const store = observe(new Counter(), mockCallback);
    focus(store);
    void store.doubleValue;
    focus(store, false);

    expect(mockCallback).toHaveBeenCalledTimes(0);

    store.value = 5;

    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(store.value).toBe(5);
  });

  test('Nested custom value is observable', async () => {
    const mockCallback = jest.fn();
    const store = observe(new Counter(), mockCallback);
    focus(store);
    peek(() => store.innerCounter); // creates the inner counter without observing
    void store.innerCounter.value;
    focus(store, false);

    // Expect 1 call to callback because the class created the inner observer when it was accessed.
    expect(mockCallback).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    store.innerCounter.increase(3);
    expect(mockCallback).toHaveBeenCalledTimes(1);
    expect(store.innerCounter.value).toBe(3);
    jest.resetAllMocks();
  });
});
