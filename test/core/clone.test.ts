import { observe, unwrap } from 'keck';
import cloneDeep from 'lodash.clonedeep';

describe('cloning observables', () => {
  test('cloneDeep() clones observable object proxies as raw objects', () => {
    const data = {
      object: { value: { nested: 'value' } },
      array: [{ nested: 'array-value' }],
    };
    const store = observe(data);

    const clone = cloneDeep(store);

    expect(clone).toEqual(data);
    expect(clone).not.toBe(data);
    expect(clone.object).not.toBe(data.object);
    expect(clone.object.value).not.toBe(data.object.value);
    expect(clone.array).not.toBe(data.array);
    expect(clone.array[0]).not.toBe(data.array[0]);
    expect(unwrap(clone)).toBe(clone);
  });

  test('cloneDeep() clones ObservableMap as a raw Map', () => {
    const key = { id: 'key' };
    const value = { nested: 'value' };
    const data = {
      map: new Map([[key, value]]),
    };
    const store = observe(data);

    const clone = cloneDeep(store.map);
    const [clonedEntry] = [...clone.entries()];

    expect(clone).toBeInstanceOf(Map);
    expect(unwrap(clone)).toBe(clone);
    expect(clone).toEqual(data.map);
    expect(clone).not.toBe(data.map);
    expect(clonedEntry[0]).toEqual(key);
    expect(clonedEntry[0]).not.toBe(key);
    expect(clonedEntry[1]).toEqual(value);
    expect(clonedEntry[1]).not.toBe(value);
  });

  test('cloneDeep() clones ObservableSet as a raw Set', () => {
    const value = { nested: 'value' };
    const data = {
      set: new Set([value]),
    };
    const store = observe(data);

    const clone = cloneDeep(store.set);
    const [clonedValue] = [...clone.values()];

    expect(clone).toBeInstanceOf(Set);
    expect(unwrap(clone)).toBe(clone);
    expect(clone).toEqual(data.set);
    expect(clone).not.toBe(data.set);
    expect(clonedValue).toEqual(value);
    expect(clonedValue).not.toBe(value);
  });
});
