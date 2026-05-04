import {
  connectDevTools,
  fromSnapshot,
  observe,
  registerObservableClass,
  transformInPlace,
} from 'keck';
import { observableFactories } from 'keck/factories/observableFactories';
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Shared devtools mock helpers
// ---------------------------------------------------------------------------

function makeMockDevTools() {
  const instance = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn<(listener: (msg: any) => void) => () => void>().mockReturnValue(() => {}),
  };
  const extension = { connect: vi.fn().mockReturnValue(instance) };
  return { extension, instance };
}

function simulateRewind(instance: ReturnType<typeof makeMockDevTools>['instance'], state: unknown) {
  const listener = instance.subscribe.mock.calls[0][0] as (msg: any) => void;
  listener({ type: 'DISPATCH', payload: { type: 'JUMP_TO_ACTION' }, state: JSON.stringify(state) });
}

afterEach(() => {
  delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
});

// ---------------------------------------------------------------------------
// Scenario 1: TypeScript `private` backing field with getter/setter
//
// Most common pattern: TypeScript `private` is purely a compile-time guard —
// at runtime `_celsius` is an ordinary enumerable own property. `toJSON`
// controls the snapshot shape; `[fromSnapshot]` restores through the setter.
// ---------------------------------------------------------------------------

describe('TypeScript private backing field', () => {
  class Temperature {
    private _celsius: number;

    constructor(celsius = 0) {
      this._celsius = celsius;
    }

    get celsius() {
      return this._celsius;
    }

    set celsius(v: number) {
      this._celsius = v;
    }

    // Expose only the public interface in the DevTools snapshot so that the
    // internal backing field (_celsius) is not surfaced as a raw key.
    toJSON() {
      return { celsius: this._celsius };
    }

    [fromSnapshot](s: { celsius: number }) {
      this.celsius = s.celsius;
    }
  }

  beforeAll(() => registerObservableClass(Temperature));
  afterAll(() => observableFactories.delete(Temperature));

  test('snapshot sent to devtools uses toJSON shape (not internal _celsius key)', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ temp: new Temperature() });
    connectDevTools(store);
    instance.send.mockClear();

    store.temp.celsius = 100;

    const [, sentState] = instance.send.mock.calls[0];
    expect(sentState).toEqual({ temp: { celsius: 100 } });
    expect(sentState.temp).not.toHaveProperty('_celsius');
  });

  test('rewind calls [fromSnapshot] and restores instance state', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ temp: new Temperature(100) });
    connectDevTools(store);

    simulateRewind(instance, { temp: { celsius: 37 } });

    expect(store.temp.celsius).toBe(37);
    expect(store.temp).toBeInstanceOf(Temperature);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: JavaScript `#` private field with Object.defineProperty arrow accessor
//
// Prototype getters/setters (`get count()`) fail through a Proxy because the
// proxy becomes `this`, which has no `#count` slot. Arrow functions defined
// via Object.defineProperty lexically bind `this` to the instance at
// construction time, so `this.#count` works even when the accessor is
// invoked through a Proxy. Methods that need to mutate `#count` should go
// through the public setter (e.g. `this.count++`) so that the proxy's set
// trap can notify keck.
// ---------------------------------------------------------------------------

describe('JavaScript # private field via Object.defineProperty arrow accessors', () => {
  class Counter {
    #count: number;

    constructor(count = 0) {
      this.#count = count;
      // Arrow functions capture `this` lexically, so #count is accessible
      // even when the accessor is called through the keck Proxy.
      Object.defineProperty(this, 'count', {
        get: () => this.#count,
        set: (v: number) => {
          this.#count = v;
        },
        enumerable: true,
        configurable: true,
      });
    }

    // Method accesses #count via the public setter so the proxy's set trap
    // fires and keck knows about the mutation.
    increment() {
      (this as any).count++;
    }

    toJSON() {
      return { count: this.#count };
    }

    [fromSnapshot](s: { count: number }) {
      (this as any).count = s.count;
    }
  }

  beforeAll(() => registerObservableClass(Counter));
  afterAll(() => observableFactories.delete(Counter));

  test('snapshot sent to devtools exposes # field via toJSON', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ counter: new Counter() });
    connectDevTools(store);
    instance.send.mockClear();

    (store.counter as any).count = 5;

    const [, sentState] = instance.send.mock.calls[0];
    expect(sentState).toEqual({ counter: { count: 5 } });
  });

  test('rewind restores # private field through the arrow setter', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ counter: new Counter(10) });
    connectDevTools(store);

    simulateRewind(instance, { counter: { count: 3 } });

    expect((store.counter as any).count).toBe(3);
    expect(store.counter).toBeInstanceOf(Counter);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Object.defineProperty — non-enumerable, writable field
//
// `enumerable: false` hides the field from JSON.stringify (and for..in), so
// only `toJSON` can surface it in the snapshot. The field is writable, so the
// setter can update it. The proxy's set trap calls the setter on the raw
// instance, so `this._secret = v` works even though the field is non-enumerable.
// ---------------------------------------------------------------------------

describe('Object.defineProperty — non-enumerable + writable via setter', () => {
  class Config {
    constructor(secret = 'initial') {
      Object.defineProperty(this, '_secret', {
        value: secret,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }

    get secret(): string {
      return (this as any)._secret;
    }

    set secret(v: string) {
      (this as any)._secret = v;
    }

    // Without toJSON the non-enumerable field would be absent from the snapshot.
    toJSON() {
      return { secret: (this as any)._secret };
    }

    [fromSnapshot](s: { secret: string }) {
      this.secret = s.secret;
    }
  }

  beforeAll(() => registerObservableClass(Config));
  afterAll(() => observableFactories.delete(Config));

  test('snapshot includes non-enumerable field via toJSON', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ cfg: new Config('alpha') });
    connectDevTools(store);
    instance.send.mockClear();

    store.cfg.secret = 'beta';

    const [, sentState] = instance.send.mock.calls[0];
    expect(sentState).toEqual({ cfg: { secret: 'beta' } });
  });

  test('rewind restores non-enumerable field via [fromSnapshot]', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ cfg: new Config('alpha') });
    connectDevTools(store);

    simulateRewind(instance, { cfg: { secret: 'gamma' } });

    expect(store.cfg.secret).toBe('gamma');
    expect(store.cfg).toBeInstanceOf(Config);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Object.defineProperty — non-writable, configurable field
//
// `writable: false` means direct assignment silently fails (or throws in
// strict mode). `configurable: true` lets Object.defineProperty redefine it.
// Inside [fromSnapshot] `this` is the proxy — Object.defineProperty on a
// proxy with no defineProperty trap falls through to the underlying target
// (the raw instance), so the raw value is updated. keck is not notified of
// the change, but the raw value is correct for the next read.
// ---------------------------------------------------------------------------

describe('Object.defineProperty — non-writable, configurable field', () => {
  class Versioned {
    constructor(version = 1) {
      Object.defineProperty(this, 'version', {
        value: version,
        writable: false,
        enumerable: true,
        configurable: true,
      });
    }

    toJSON() {
      return { version: (this as any).version };
    }

    [fromSnapshot](s: { version: number }) {
      Object.defineProperty(this, 'version', {
        value: s.version,
        writable: false,
        enumerable: true,
        configurable: true,
      });
    }
  }

  beforeAll(() => registerObservableClass(Versioned));
  afterAll(() => observableFactories.delete(Versioned));

  test('snapshot includes non-writable field via toJSON', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ v: new Versioned(1) });
    connectDevTools(store);

    expect(instance.init).toHaveBeenCalledWith({ v: { version: 1 } });
  });

  test('rewind restores non-writable field via Object.defineProperty in [fromSnapshot]', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe({ v: new Versioned(1) });
    connectDevTools(store);

    simulateRewind(instance, { v: { version: 42 } });

    expect((store.v as any).version).toBe(42);
    expect(store.v).toBeInstanceOf(Versioned);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Class as the store root (not nested in a plain object)
//
// When the observable is the class instance itself, transformInPlace is called
// with the class proxy as the root target. [fromSnapshot] must be detected and
// called at the root level.
// ---------------------------------------------------------------------------

describe('class as store root', () => {
  class AppState {
    private _count: number;
    private _label: string;

    constructor(count = 0, label = '') {
      this._count = count;
      this._label = label;
    }

    get count() {
      return this._count;
    }
    set count(v: number) {
      this._count = v;
    }
    get label() {
      return this._label;
    }
    set label(v: string) {
      this._label = v;
    }

    toJSON() {
      return { count: this._count, label: this._label };
    }

    [fromSnapshot](s: { count: number; label: string }) {
      this.count = s.count;
      this.label = s.label;
    }
  }

  beforeAll(() => registerObservableClass(AppState));
  afterAll(() => observableFactories.delete(AppState));

  test('rewind calls [fromSnapshot] on the root class instance', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const store = observe(new AppState(10, 'hello'));
    connectDevTools(store);

    simulateRewind(instance, { count: 99, label: 'world' });

    expect(store.count).toBe(99);
    expect(store.label).toBe('world');
    expect(store).toBeInstanceOf(AppState);
  });
});

// ---------------------------------------------------------------------------
// transformInPlace unit tests for [fromSnapshot]
// ---------------------------------------------------------------------------

describe('transformInPlace with [fromSnapshot]', () => {
  test('calls [fromSnapshot] on target instead of merging when present', () => {
    const fromSnapshotFn = vi.fn();

    class MyClass {
      value = 0;
      [fromSnapshot] = fromSnapshotFn;
    }

    const instance = new MyClass();
    const snapshot = { value: 42 };
    transformInPlace(instance, snapshot);

    expect(fromSnapshotFn).toHaveBeenCalledWith(snapshot);
    expect(instance.value).toBe(0); // [fromSnapshot] is a mock, so value unchanged
  });

  test('calls [fromSnapshot] on nested class instance, not replacing it with plain object', () => {
    const fromSnapshotFn = vi.fn((s: any) => {
      instance.value = s.value;
    });

    class MyClass {
      value = 0;
      [fromSnapshot] = fromSnapshotFn;
    }

    const instance = new MyClass();
    const container = { obj: instance };

    transformInPlace(container, { obj: { value: 99 } });

    expect(fromSnapshotFn).toHaveBeenCalledWith({ value: 99 });
    expect(container.obj).toBe(instance); // same reference, not replaced
    expect(container.obj.value).toBe(99);
  });

  test('returns target (not source) when [fromSnapshot] is present at root', () => {
    const instance = { [fromSnapshot]: vi.fn() };
    const result = transformInPlace(instance, { anything: true });
    expect(result).toBe(instance);
  });

  test('calls [fromSnapshot] on nested class instance when snapshot value is a primitive', () => {
    // When the snapshot provides a non-object (e.g. a number) for a key whose current value is a
    // class instance with [fromSnapshot], we call [fromSnapshot] with the primitive rather than
    // replacing the reference. This lets the class decide how to handle a non-object snapshot.
    const fromSnapshotFn = vi.fn();

    class MyClass {
      value = 0;
      [fromSnapshot] = fromSnapshotFn;
    }

    const instance = new MyClass();
    const container = { obj: instance };

    transformInPlace(container, { obj: 42 });

    expect(fromSnapshotFn).toHaveBeenCalledWith(42);
    expect(container.obj).toBe(instance); // reference preserved, not replaced
  });

  test('does not call [fromSnapshot] when target is a plain object without it', () => {
    const target = { value: 0 };
    transformInPlace(target, { value: 42 });
    expect(target.value).toBe(42); // normal merge, no [fromSnapshot]
  });
});
