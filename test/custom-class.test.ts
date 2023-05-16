import { observe, observableFactories, objectAndArrayObservableFactory } from "#src";

class Counter {
  private _number = 0;

  innerCounter = new InnerCounter();

  get number() {
    return this._number;
  }

  increase() {
    this._number++;
  }
}

class InnerCounter {
  private _number = 0;

  get number() {
    return this._number;
  }

  increase() {
    this._number++;
  }
}

observableFactories.set(Counter, objectAndArrayObservableFactory);
observableFactories.set(InnerCounter, objectAndArrayObservableFactory);

describe("Custom classes", () => {
  test("Value is modified and callback is triggered", () => {
    const mockListener = jest.fn();
    const store = observe(new Counter(), mockListener);

    void store.number;
    void store.innerCounter.number;

    // Modify set & check values
    store.increase();
    store.increase();
    store.increase();

    store.innerCounter.increase();
    store.innerCounter.increase();

    expect(store.number).toBe(3);
    expect(store.innerCounter.number).toBe(2);

    expect(mockListener).toHaveBeenCalledTimes(5);
  });
});
