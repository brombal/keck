import { configure, createObserver } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  object1: { value1: "object1-value1", value2: "object1-value2" },
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
  ],
});

describe("Clone", () => {
  test("References to intermediate properties change if cloning", () => {
    const data = createData();

    const store = createObserver(data, () => {});
    configure(store, { clone: true });

    // Grab references to original arrays to test references
    const object1 = store.object1;
    const array1 = store.array1;
    const array1_0 = store.array1[0];
    const array1_1 = store.array1[1];
    const array2 = store.array2;

    store.object1.value1 = "new-array1-0-value1";
    store.array1[0].value1 = "new-array1-0-value1";
    store.array1[1] = { value1: "new-array1-1-value1", value2: "new-array1-1-value2" };

    // Check that object references that were modified are different; but those that weren't modified are identical
    expect(store.object1).not.toBe(object1);
    expect(store.array1).not.toBe(array1);
    expect(store.array1[0]).not.toBe(array1_0);
    expect(store.array1[1]).not.toBe(array1_1);
    expect(store.array2).toBe(array2);
  });

  test("References to intermediate properties do not change if not cloning", () => {
    const data = createData();

    const store = createObserver(data, () => {});

    // Grab references to original arrays to test references
    const object1 = store.object1;
    const array1 = store.array1;
    const array1_0 = store.array1[0];
    const array1_1 = store.array1[1];
    const array2 = store.array2;

    store.object1.value1 = "new-array1-0-value1";
    store.array1[0].value1 = "new-array1-0-value1";
    store.array1[1] = { value1: "new-array1-1-value1", value2: "new-array1-1-value2" };

    // Check that object references that were modified are different; but those that weren't modified are identical
    expect(store.object1).toBe(object1);
    expect(store.array1).toBe(array1);
    expect(store.array1[0]).toBe(array1_0);
    expect(store.array1[1]).not.toBe(array1_1);
    expect(store.array2).toBe(array2);
  });
});
