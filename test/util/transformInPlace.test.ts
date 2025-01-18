import { transformInPlace } from 'keck'; // Adjust the import path as needed

describe('transformInPlace', () => {
  test('Returns source if target or source is not an object or array', () => {
    expect(transformInPlace(123, {})).toEqual({});
    expect(transformInPlace('string', [])).toEqual([]);
    expect(transformInPlace({}, [])).toEqual([]);
    expect(transformInPlace({}, 123)).toEqual(123);
    expect(transformInPlace([], 123)).toEqual(123);
  });

  test('transforms a simple object into another object (shallow)', () => {
    const target = { a: 1, b: 2 };
    const source = { a: 10, c: 30 };
    transformInPlace(target, source);

    expect(target).toEqual({ a: 10, c: 30 });
    // Ensures that "b" was removed, "a" was updated, "c" was added
  });

  test('transforms nested objects (deep)', () => {
    const target = {
      level1: {
        level2: {
          key: 'old',
          removeMe: true,
        },
      },
      keep: 'keepMe',
    };
    const source = {
      level1: {
        level2: {
          key: 'new',
          addMe: 123,
        },
      },
      newTopLevel: 'added',
    };
    transformInPlace(target, source);

    expect(target).toEqual({
      level1: {
        level2: {
          key: 'new',
          addMe: 123,
        },
      },
      newTopLevel: 'added',
    });
  });

  test('transforms arrays (same length)', () => {
    const target = [1, 2, 3];
    const source = [10, 20, 30];
    transformInPlace(target, source);

    expect(target).toEqual([10, 20, 30]);
  });

  test('transforms arrays (different lengths)', () => {
    const target = [1, 2, 3, 4];
    const source = [10, 20];
    transformInPlace(target, source);

    expect(target).toEqual([10, 20]);
    // ensures we removed extra elements
  });

  test('recursively transforms nested arrays', () => {
    const target = [1, [2, [3]]];
    const source = [10, [20, [30, 40]]];
    transformInPlace(target, source);

    expect(target).toEqual([10, [20, [30, 40]]]);
  });

  test('transforms an array within an object', () => {
    const target = {
      list: [1, 2, 3],
      keep: 'hello',
    };
    const source = {
      list: [10, 20],
      extra: 'something',
    };
    transformInPlace(target, source);
    expect(target).toEqual({
      list: [10, 20],
      extra: 'something',
    });
  });

  test('object <-> array mismatch => direct replacement', () => {
    // If target is an array and source is an object,
    // we replace the target array with the object.
    const target = { a: 1 } as any;
    const source = [2, 3] as any;

    const result = transformInPlace(target, source);

    expect(result).toEqual([2, 3]);

    // Similarly, if we pass in reversed roles:
    const target2 = [1, 2] as any;
    const source2 = { x: 10 } as any;

    const result2 = transformInPlace(target2, source2);
    expect(result2).toEqual({ x: 10 });
  });

  test('replaces with complex objects (e.g. Date, RegExp, Map)', () => {
    const target = {
      dateVal: 'old string date', // replace a primitive
      mapVal: { some: 'object' }, // replace an object
      nested: { dateHere: { some: 'object' } }, // replace a nested object
      array: ['regex here'], // replace an array
    };
    const source = {
      dateVal: new Date('2020-01-01'),
      mapVal: new Map<string, string>([['key', 'value']]),
      nested: { dateHere: new Date('2021-02-02') },
      array: /foo/,
    };

    transformInPlace(target, source);

    expect(target.dateVal).toEqual(new Date('2020-01-01'));
    // direct replacement => the type is now a real Date
    expect(target.mapVal).toBeInstanceOf(Map);

    // But note that nested.dateHere is *also* replaced directly,
    // because new Date(...) is a complex object, not a plain object or array
    expect(target.nested.dateHere).toEqual(new Date('2021-02-02'));

    // RegExp is also a complex object
    expect(target.array).toEqual(/foo/);
  });

  test('replaces complex objects (e.g. Date, RegExp, Map, Set)', () => {
    const target = {
      dateVal: new Date('2020-01-01'),
      mapVal: new Map<string, string>([['key', 'value']]),
      nested: { dateHere: new Date('2021-02-02') },
      array: [/foo/],
    };
    const source = {
      dateVal: 'new string date', // replace a primitive
      mapVal: { some: 'object' }, // replace an object
      nested: { dateHere: { some: 'object' } }, // replace a nested object
      array: [{ regex: 'here' }], // replace an array
    };

    transformInPlace(target, source);

    expect(target.dateVal).toEqual('new string date');
    // direct replacement => the type is now a plain object
    expect(target.mapVal).toEqual({ some: 'object' });

    // But note that nested.dateHere is *also* replaced directly,
    // because new Date(...) is a complex object, not a plain object or array
    expect(target.nested.dateHere).toEqual({ some: 'object' });

    // RegExp is also a complex object
    expect(target.array).toEqual([{ regex: 'here' }]);
  });

  test('in-place modification preserves the same reference at the top level', () => {
    const originalTarget = { a: 1, nested: { b: 2 } };
    const originalRef = originalTarget;

    const source = { a: 999, nested: { c: 3 } };

    const returned = transformInPlace(originalTarget, source);
    expect(returned).toBe(originalRef);
    expect(originalTarget).toEqual({
      a: 999,
      nested: { c: 3 },
    });
  });

  test('prunes properties not in source (including nested)', () => {
    const target = {
      keepMe: 1,
      removeMe: 2,
      nested: {
        keepNested: 3,
        removeNested: 4,
      },
    };
    const source = {
      keepMe: 10,
      nested: {
        keepNested: 30,
      },
    };
    transformInPlace(target, source);
    expect(target).toEqual({
      keepMe: 10,
      nested: {
        keepNested: 30,
      },
    });
  });

  test('primitives in source directly replace target value', () => {
    const target = { a: { nested: true }, b: [1, 2, 3] };
    const source = { a: 42, b: 'a string now' };
    transformInPlace(target, source);

    // 'a' is replaced by 42
    // 'b' is replaced by 'a string now'
    expect(target).toEqual({ a: 42, b: 'a string now' });
  });

  test('Non-standard array properties are assigned correctly', () => {
    const target = [1, 2, 3];
    const source = [10, 20, 30];
    (source as any).extra = 'extra';
    transformInPlace(target, source);

    expect([...target]).toEqual([10, 20, 30]); // isEqual will fail because of 'extra', even if numeric array entries are equal
    expect((target as any).extra).toBe('extra');
  });

  test('Inherited object properties are assigned correctly', () => {
    const target: any = { targetProp: 'target' };
    const source: any = Object.create({ parentProp: 'parent' });
    source.childProp = 'child';
    transformInPlace(target, source);

    expect(target.targetProp).toBeUndefined();
    expect(target.childProp).toBe('child');
    expect(target.parentProp).toBe('parent');
  });
});
