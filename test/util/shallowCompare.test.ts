import { shallowCompare } from "keck";

describe("shallowCompare", () => {
  test("Object comparison works", () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2 };
    const obj3 = { a: 1, b: 3 };
    const obj4 = { a: 1, b: 2, c: 3 };
    const obj5 = { a: 1, b: 2, c: 3 };
    const obj6 = { a: 1, b: 2, c: 4 };

    expect(shallowCompare(obj1, obj2)).toBe(true);
    expect(shallowCompare(obj1, obj3)).toBe(false);
    expect(shallowCompare(obj1, obj4)).toBe(false);
    expect(shallowCompare(obj4, obj5)).toBe(true);
    expect(shallowCompare(obj4, obj6)).toBe(false);
  });

  test("Array comparison works", () => {
    const arr1 = [1, 2];
    const arr2 = [1, 2];
    const arr3 = [1, 3];
    const arr4 = [1, 2, 3];
    const arr5 = [1, 2, 3];
    const arr6 = [1, 2, 4];

    expect(shallowCompare(arr1, arr2)).toBe(true);
    expect(shallowCompare(arr1, arr3)).toBe(false);
    expect(shallowCompare(arr1, arr4)).toBe(false);
    expect(shallowCompare(arr4, arr5)).toBe(true);
    expect(shallowCompare(arr4, arr6)).toBe(false);
  });

  test("Primitive comparison works", () => {
    expect(shallowCompare(1, 1)).toBe(true);
    expect(shallowCompare(1, 2)).toBe(false);
    expect(shallowCompare("a", "a")).toBe(true);
    expect(shallowCompare("a", "b")).toBe(false);
    expect(shallowCompare(true, true)).toBe(true);
    expect(shallowCompare(true, false)).toBe(false);
    expect(shallowCompare(null, undefined)).toBe(false);
    expect(shallowCompare(null, {})).toBe(false);
  });
});
