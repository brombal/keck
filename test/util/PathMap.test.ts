import { PathMap } from "#keck/util/PathMap";

describe("PathMap", () => {
  test("set/get works", () => {
    // Usage
    const arrmap = new PathMap<string>();

    const x = { x: 1 };
    const y = { x: 1 };

    arrmap.set([], "a");
    arrmap.set([1], "b");
    arrmap.set([1, "a", x], "c");
    arrmap.set([1, "a", y], "d");
    arrmap.set(["a", x], "e");
    arrmap.set(["a", x, 3], "f");

    expect(arrmap.get([])).toEqual("a");
    expect(arrmap.get([1])).toEqual("b");
    expect(arrmap.get([1, "a"])).toBeUndefined();
    expect(arrmap.get([1, "a", x])).toEqual("c");
    expect(arrmap.get([1, "a", y])).toEqual("d");
    expect(arrmap.get(["a"])).toBeUndefined();
    expect(arrmap.get(["a", x])).toEqual("e");
    expect(arrmap.get(["a", x, 3])).toEqual("f");
  });

  test("collect works", () => {
    // Usage
    const arrmap = new PathMap<string>();

    const x = { x: 1 };

    arrmap.set([], "a");
    arrmap.set([1], "b");
    arrmap.set([1, "a", x], "c");
    arrmap.set(["a", x], "d");
    arrmap.set(["a", x, 3], "e");

    expect(arrmap.collect([])).toEqual(["a", "b", "c", "d", "e"]);
    expect(arrmap.collect([1])).toEqual(["a", "b", "c"]);
    expect(arrmap.collect([1, "a"])).toEqual(["a", "b", "c"]);
    expect(arrmap.collect(["a"])).toEqual(["a", "d", "e"]);
    expect(arrmap.collect(["a", x])).toEqual(["a", "d", "e"]);
    expect(arrmap.collect(["a", x, 3])).toEqual(["a", "d", "e"]);

    expect(arrmap.collect([], "ancestors")).toEqual(["a"]);
    expect(arrmap.collect([1], "ancestors")).toEqual(["a", "b"]);
    expect(arrmap.collect([1, "a"], "ancestors")).toEqual(["a", "b"]);
    expect(arrmap.collect(["a"], "ancestors")).toEqual(["a"]);
    expect(arrmap.collect(["a", x], "ancestors")).toEqual(["a", "d"]);
    expect(arrmap.collect(["a", x, 3], "ancestors")).toEqual(["a", "d", "e"]);

    expect(arrmap.collect([], "children")).toEqual(["a", "b", "c", "d", "e"]);
    expect(arrmap.collect([1], "children")).toEqual(["b", "c"]);
    expect(arrmap.collect([1, "a"], "children")).toEqual(["c"]);
    expect(arrmap.collect(["a"], "children")).toEqual(["d", "e"]);
    expect(arrmap.collect(["a", x], "children")).toEqual(["d", "e"]);
    expect(arrmap.collect(["a", x, 3], "children")).toEqual(["e"]);
  });
});
