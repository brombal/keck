import { observe, unwrap } from "#src";

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

describe("observe with selectors", () => {
  test("Calls callback when selector result changes (observable)", () => {
    const mockFn = jest.fn();

    const data = createData();

    const [state, reset] = observe(data, (state) => state.object1, mockFn);

    state.object1.value1 = "new-object1-value1";

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith({ ...data.object1, value1: "new-object1-value1" }, data);
    mockFn.mockClear();

    state.array1[0].value1 = "new-array1-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Calls callback when selector result changes (derived value; but only intermediates accessed)", () => {
    const mockFn = jest.fn();

    const data = createData();

    const [state, reset] = observe(data, (state) => !!state.object1, mockFn);

    state.object1 = null!;

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(false, data);
    mockFn.mockClear();

    state.array1[0].value1 = "new-array1-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Calls callback when selector result changes (shallow compare)", () => {
    const mockFn = jest.fn();

    const data = createData();

    const [state, reset] = observe(data, (state) => [state.object1, state.array1], mockFn);

    state.object1.value1 = "new-object1-value1";

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(
      [{ ...data.object1, value1: "new-object1-value1" }, data.array1],
      data
    );
    mockFn.mockClear();

    state.array1[0].value1 = "new-array1-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(
      [data.object1, [{ ...data.array1[0], value1: "new-array1-0-value1" }, data.array1[1]]],
      data
    );
    mockFn.mockClear();

    state.array2[0].value1 = "new-array2-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Does not call callback after reset() is called", () => {
    const mockFn = jest.fn();

    const data = createData();

    const [state, actions] = observe(data, (state) => state.object1, mockFn);

    actions.reset();
    state.object1.value1 = "new-object1-value1-2";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });
});
