import { createObserver, derive, reset, configure, unwrap } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  object1: { value1: "object1-value1", value2: "object1-value2", value3: 0 },
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
  test("Calls callback when selector result changes (select())", () => {
    const mockFn = jest.fn();

    const data = createData();

    const state = createObserver(data, mockFn);

    derive(() => state.object1.value3 % 2 === 0);

    state.object1.value3 = 2;

    expect(mockFn).toHaveBeenCalledTimes(0);
    mockFn.mockClear();

    state.object1.value3 = 3;
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(data.object1, "value3");
    mockFn.mockClear();

    state.object1.value3 = 5;
    expect(mockFn).toHaveBeenCalledTimes(0);
    mockFn.mockClear();

    state.object1.value3 = 6;
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(data.object1, "value3");
    mockFn.mockClear();
  });

  test("Calls callback regardless of selector when there is already an observation", () => {
    const mockFn = jest.fn();

    const data = createData();

    const state = createObserver(data, mockFn);
    configure(state, { select: true, clone: true });

    derive(() => state.object1.value3 % 2 === 0);

    // Creates an unconditional observation on value3
    void state.object1.value3;

    // We're now observing state.object1 (from the derive), and state.object1.value3 (from the above line)
    // The derive fn will be called for changes to state.object1, which will trigger the callback if the derived result changes
    // The callback will also be called for changes to state.object1.value3, regardless of the derive fn result

    // state.object1.value3 = 2;

    // expect(mockFn).toHaveBeenCalledTimes(1); // state.object1 changed (+1), derived result did not (0)
    // expect(mockFn).toHaveBeenCalledWith(data.object1, "value3");
    // mockFn.mockClear();

    state.object1.value3 = 3;
    expect(mockFn).toHaveBeenCalledTimes(2); // state.object1 changed (+1), derived result changed (+1)
    expect(mockFn).toHaveBeenCalledWith(data.object1, "value3");
    mockFn.mockClear();

    state.object1.value3 = 5;
    expect(mockFn).toHaveBeenCalledTimes(1); // state.object1 changed (+1), but selector result did not (0)
    expect(mockFn).toHaveBeenCalledWith(data.object1, "value3");
    mockFn.mockClear();

    state.object1.value3 = 6;
    expect(mockFn).toHaveBeenCalledTimes(2); // state.object1 changed (+1), selector result changed (+1)
    expect(mockFn).toHaveBeenCalledWith(data.object1, "value3");
    mockFn.mockClear();
  });

  test("Calls callback when selector result changes (observable with clone)", () => {
    const mockFn = jest.fn();

    const data = createData();

    const state = createObserver(data, (state) => state.object1, mockFn);
    configure(state, { clone: true });

    state.object1.value1 = "new-object1-value1";

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(
      { ...data.object1, value1: "new-object1-value1" },
      { ...data.object1, value1: "new-object1-value1" },
      "value1"
    );
    mockFn.mockClear();

    state.array1[0].value1 = "new-array1-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Calls callback when selector result changes (derived value; but only intermediates accessed)", () => {
    const mockFn = jest.fn();

    const data = createData();

    const state = createObserver(data, (state) => !!state.object1, mockFn);

    state.object1 = null!;

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(false, data, "object1");
    mockFn.mockClear();

    state.array1[0].value1 = "new-array1-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Calls callback when selector result changes (shallow compare)", () => {
    const mockFn = jest.fn();

    const data = createData();

    const state = createObserver(
      data,
      (state) => [state.object1, state.array1],
      mockFn,
      (a, b) => a.every((v, i) => v === b[i])
    );

    state.object1.value1 = "new-object1-value1";

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(
      [{ ...data.object1, value1: "new-object1-value1" }, data.array1],
      { ...data.object1, value1: "new-object1-value1" },
      "value1"
    );
    mockFn.mockClear();

    state.array1[0].value1 = "new-array1-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(
      [data.object1, [{ ...data.array1[0], value1: "new-array1-0-value1" }, data.array1[1]]],
      { ...state.array1[0], value1: "new-array1-0-value1" },
      "value1"
    );
    mockFn.mockClear();

    state.array2[0].value1 = "new-array2-0-value1";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Does not call callback after reset() is called", () => {
    const mockFn = jest.fn();

    const data = createData();

    const state = createObserver(data, (state) => state.object1, mockFn);

    reset(state);
    state.object1.value1 = "new-object1-value1-2";

    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test("Nested selectors", () => {
    const mockFn = jest.fn();

    const data = createData();

    let result: boolean;
    function callback() {
      mockFn(result);
    }

    const state = createObserver(data, callback);
    derive(() => {
      void 0;
      const isEven = derive(() => state.value2 % 2 === 0);
      const isTriple = derive(() => state.object1.value3 % 3 === 0);
      return (result = isEven && isTriple);
    });
    configure(state, { select: false });

    // even & triple
    state.value2 = 2; // even; triple
    expect(mockFn).toHaveBeenCalledTimes(0);
    mockFn.mockClear();

    state.object1.value3 = 6; // still even and triple
    expect(mockFn).toHaveBeenCalledTimes(0);
    mockFn.mockClear();

    state.value2 = 3; // not even
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(false);
    mockFn.mockClear();

    state.object1.value3 = 8; // not even; not triple
    expect(mockFn).toHaveBeenCalledTimes(0);
    mockFn.mockClear();

    state.value2 = 4; // even; not triple
    expect(mockFn).toHaveBeenCalledTimes(0);

    state.object1.value3 = 9; // even; triple
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith(true);
  });
});
