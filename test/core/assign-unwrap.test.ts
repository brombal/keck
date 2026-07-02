import { observe, unwrap } from 'keck';

/**
 * Invariant: raw observable state never contains observable proxies.
 *
 * Every write path unwraps assigned values before storing them — so as long as a value entered
 * the graph through an observable write (property assignment, array index/method, Set/Map
 * methods), the underlying raw data is always plain. Consumers that hold raw state (via
 * unwrap()) can safely deep-traverse it (cloning, equality checks, serialization).
 *
 * Note this only holds for writes that pass through an observable. Building a *plain* container
 * in userland with proxies inside (e.g. `{ x: store.someObject }`) and assigning it wholesale
 * stores that container's contents as-is — only the assigned value itself is unwrapped, not
 * values nested inside plain containers.
 */
describe('assignment unwraps observable proxies', () => {
  test('object property assignment stores the raw value (cross-graph)', () => {
    const storeA = observe({ slot: null as unknown }, () => {});
    const storeB = observe({ obj: { a: 1 }, arr: [1, 2] }, () => {});

    storeA.slot = storeB.obj;
    expect(unwrap(storeA).slot).toBe(unwrap(storeB.obj));
    // The raw state holds no proxy:
    expect(unwrap(unwrap(storeA).slot)).toBe(unwrap(storeA).slot);

    storeA.slot = storeB.arr;
    expect(unwrap(storeA).slot).toBe(unwrap(storeB.arr));
  });

  test('nested property assignment stores the raw value', () => {
    const storeA = observe({ nested: { slot: null as unknown } }, () => {});
    const storeB = observe({ obj: { a: 1 } }, () => {});

    storeA.nested.slot = storeB.obj;
    expect(unwrap(storeA).nested.slot).toBe(unwrap(storeB.obj));
  });

  test('array index writes and array methods store the raw value', () => {
    const storeA = observe({ list: [null as unknown] }, () => {});
    const storeB = observe({ obj: { a: 1 }, obj2: { b: 2 } }, () => {});

    storeA.list[0] = storeB.obj;
    expect(unwrap(storeA).list[0]).toBe(unwrap(storeB.obj));

    // Array methods execute with the observable as `this`, so element writes pass through the
    // set trap and unwrap.
    storeA.list.push(storeB.obj2);
    expect(unwrap(storeA).list[1]).toBe(unwrap(storeB.obj2));

    storeA.list.splice(0, 1, storeB.obj2);
    expect(unwrap(storeA).list[0]).toBe(unwrap(storeB.obj2));
  });

  test('Set.add and Map.set store the raw value', () => {
    const storeA = observe({ set: new Set<unknown>(), map: new Map<unknown, unknown>() }, () => {});
    const storeB = observe({ obj: { a: 1 }, key: { k: 1 } }, () => {});

    storeA.set.add(storeB.obj);
    expect([...unwrap(storeA).set][0]).toBe(unwrap(storeB.obj));

    storeA.map.set(storeB.key, storeB.obj);
    const [entry] = [...unwrap(storeA).map.entries()];
    expect(entry[0]).toBe(unwrap(storeB.key));
    expect(entry[1]).toBe(unwrap(storeB.obj));
  });

  test('same-graph proxy assignment also stores the raw value', () => {
    const store = observe({ a: { x: 1 }, b: null as unknown }, () => {});

    store.b = store.a;
    expect(unwrap(store).b).toBe(unwrap(store).a);
    expect(unwrap(unwrap(store).b)).toBe(unwrap(store).b);
  });
});
