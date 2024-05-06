import { focus, observe, peek } from "#keck";

import { createData } from "../shared-data";

describe("peek()", () => {
  test("Modifying property that was peeked does not trigger callback", () => {
    const data = createData();

    const mockCallback1 = jest.fn();
    const store1 = observe(data, mockCallback1);
    focus(store1);
    peek(() => store1.value1);
    void store1.value2;
    peek(() => store1.value3);
    focus(store1, false);

    const mockCallback2 = jest.fn();
    const store2 = observe(data, mockCallback2);
    focus(store2);
    peek(() => store2.value1);
    peek(() => store2.value2);
    void store2.value3;
    focus(store2, false);

    // value1 peeked by both store; no callback triggered
    store1.value1 = "new-value1";
    expect(mockCallback1).toHaveBeenCalledTimes(0);
    jest.resetAllMocks();

    // value2 peeked by store2 but observed by store1; callback triggered once
    store1.value2 = 1;
    expect(mockCallback1).toHaveBeenCalledTimes(1);
    jest.resetAllMocks();

    // value3 peeked by store1 but observed by store2; callback triggered once
    store1.value3 = false;
    expect(mockCallback2).toHaveBeenCalledTimes(1);
    jest.resetAllMocks();
  });
});
