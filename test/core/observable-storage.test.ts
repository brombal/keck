import { observe, unwrap } from 'keck';

describe('observable storage', () => {
  test('object and array assignments store raw values', () => {
    const source = observe({
      object: { value: 'object' },
      arrayValue: { value: 'array' },
    });
    const target = observe({
      object: {} as { child?: { value: string } },
      array: [] as Array<{ value: string }>,
    });

    target.object.child = source.object as any;
    target.array.push(source.arrayValue);

    expect(unwrap(target).object.child).toBe(unwrap(source.object));
    expect(unwrap(target).array[0]).toBe(unwrap(source.arrayValue));
  });

  test('Map entries store raw keys and values', () => {
    const source = observe({
      key: { id: 'key' },
      value: { id: 'value' },
    });
    const target = observe({
      map: new Map<object, object>(),
    });

    target.map.set(source.key, source.value);

    const rawMap = unwrap(target.map);
    expect(rawMap.has(unwrap(source.key))).toBe(true);
    expect(rawMap.has(source.key)).toBe(false);
    expect(rawMap.get(unwrap(source.key))).toBe(unwrap(source.value));
    expect(target.map.has(source.key)).toBe(true);
    expect(target.map.get(source.key)).not.toBe(source.value);
    expect(unwrap(target.map.get(source.key))).toBe(unwrap(source.value));
    expect(target.map.delete(source.key)).toBe(true);
    expect(rawMap.size).toBe(0);
  });

  test('Set entries store raw values', () => {
    const source = observe({
      value: { id: 'value' },
    });
    const target = observe({
      set: new Set<object>(),
    });

    target.set.add(source.value);

    const rawSet = unwrap(target.set);
    expect(rawSet.has(unwrap(source.value))).toBe(true);
    expect(rawSet.has(source.value)).toBe(false);
    expect(target.set.has(source.value)).toBe(true);
    expect(target.set.delete(source.value)).toBe(true);
    expect(rawSet.size).toBe(0);
  });
});
