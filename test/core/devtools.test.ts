import { atomic, connectDevTools, observe } from 'keck';
import { vi } from 'vitest';

function makeMockDevTools() {
  const instance = {
    init: vi.fn(),
    send: vi.fn(),
    subscribe: vi.fn<(listener: (msg: any) => void) => () => void>().mockReturnValue(() => {}),
  };
  const extension = { connect: vi.fn().mockReturnValue(instance) };
  return { extension, instance };
}

describe('connectDevTools', () => {
  afterEach(() => {
    delete (window as any).__REDUX_DEVTOOLS_EXTENSION__;
  });

  test('returns a no-op disconnect when extension is not available', () => {
    const data = { count: 0 };
    const store = observe(data);
    const disconnect = connectDevTools(store);
    expect(typeof disconnect).toBe('function');
    store.count++; // should not throw
    disconnect();
  });

  test('connects with default name and sends initial state', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    connectDevTools(store);

    expect(extension.connect).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) }),
    );
    expect(instance.init).toHaveBeenCalledWith({ count: 0 });
  });

  test('connects with custom name when provided', () => {
    const { extension } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    connectDevTools(store, { name: 'MyStore' });

    expect(extension.connect).toHaveBeenCalledWith(expect.objectContaining({ name: 'MyStore' }));
  });

  test('sends mutation to devtools with default action type', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    connectDevTools(store);
    instance.send.mockClear();

    store.count = 5;
    expect(instance.send).toHaveBeenCalledWith({ type: '@@keck/mutation' }, { count: 5 });
  });

  test('sends mutation with sourceName as action type when proxy has a name', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const namedStore = observe(data, { name: 'counter' });
    connectDevTools(data);
    instance.send.mockClear();

    namedStore.count = 5;
    expect(instance.send).toHaveBeenCalledWith({ type: 'counter' }, { count: 5 });
  });

  test('sends mutation with actionName when inside a named atomic', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    connectDevTools(store);
    instance.send.mockClear();

    atomic('increment', () => {
      store.count++;
    });

    expect(instance.send).toHaveBeenCalledWith({ type: 'increment' }, { count: 1 });
  });

  test('combines actionName and sourceName when both are present', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const namedStore = observe(data, { name: 'counter' });
    connectDevTools(data);
    instance.send.mockClear();

    atomic('increment', () => {
      namedStore.count++;
    });

    expect(instance.send).toHaveBeenCalledWith({ type: 'increment (counter)' }, { count: 1 });
  });

  test('time-travel via JUMP_TO_ACTION updates store without sending notification', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    connectDevTools(store);
    instance.send.mockClear();

    const listener = instance.subscribe.mock.calls[0][0] as (msg: any) => void;
    listener({
      type: 'DISPATCH',
      payload: { type: 'JUMP_TO_ACTION' },
      state: JSON.stringify({ count: 42 }),
    });

    expect(store.count).toBe(42);
    expect(instance.send).not.toHaveBeenCalled();
  });

  test('ignores devtools messages that are not JUMP_TO_ACTION', () => {
    const { extension, instance } = makeMockDevTools();
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    connectDevTools(store);
    instance.send.mockClear();

    const listener = instance.subscribe.mock.calls[0][0] as (msg: any) => void;
    listener({ type: 'DISPATCH', payload: { type: 'RESET' }, state: JSON.stringify({ count: 0 }) });
    listener({
      type: 'OTHER',
      payload: { type: 'JUMP_TO_ACTION' },
      state: JSON.stringify({ count: 0 }),
    });

    expect(store.count).toBe(0); // no change
    expect(instance.send).not.toHaveBeenCalled();
  });

  test('disconnect unsubscribes from devtools', () => {
    const unsubscribeMock = vi.fn();
    const { extension, instance } = makeMockDevTools();
    instance.subscribe.mockReturnValue(unsubscribeMock);
    (window as any).__REDUX_DEVTOOLS_EXTENSION__ = extension;

    const data = { count: 0 };
    const store = observe(data);
    const disconnect = connectDevTools(store);
    instance.send.mockClear();

    disconnect();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
