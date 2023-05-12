import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useObserver, useObserveSelector } from "#src";

const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
  ],
});

test("Subscriptions are reset on each render", async () => {
  const mockListener = jest.fn();
  const data = createData();

  function NameAge() {
    const store = useObserver(data);

    mockListener();

    const [showValue1, setShowValue1] = useState(false);

    return (
      <div>
        {showValue1 && <div>{store.value2}</div>}

        <input
          type="checkbox"
          checked={showValue1}
          onChange={() => {
            setShowValue1((s) => !s);
          }}
        />

        <button
          onClick={() => {
            store.value2++;
          }}
        >
          Grow
        </button>
      </div>
    );
  }

  render(<NameAge />);

  mockListener.mockClear();

  // Click grow button; expect render count to be 0
  await userEvent.click(screen.getByText("Grow"));
  expect(mockListener).toHaveBeenCalledTimes(0);

  // Show age; click grow button; expect render count to be 1
  await userEvent.click(screen.getByRole("checkbox"));
  mockListener.mockClear();
  await userEvent.click(screen.getByText("Grow"));
  expect(mockListener).toHaveBeenCalledTimes(1);

  // Hide age; click grow button; expect render count to be 0
  await userEvent.click(screen.getByRole("checkbox"));
  mockListener.mockClear();
  await userEvent.click(screen.getByText("Grow"));
  expect(mockListener).toHaveBeenCalledTimes(0);
});

test("useObserveSelector only re-renders when selector result changes", async () => {
  const mockListener = jest.fn();
  const data = createData();

  function IsLessThan2() {
    const [isEven, state] = useObserveSelector(data, (state) => {
      return state.value2 < 2;
    });

    mockListener();

    return (
      <div>
        {state.value2}
        {isEven && "even!"}
        <button onClick={() => state.value2++}>Increase</button>
      </div>
    );
  }

  render(<IsLessThan2 />);

  mockListener.mockClear();

  // Click grow button (value is now 1); expect render count to be 0
  await userEvent.click(screen.getByText("Increase"));
  expect(mockListener).toHaveBeenCalledTimes(0);

  // Click grow button (value is now 2); expect render count to be 1
  await userEvent.click(screen.getByText("Increase"));
  expect(mockListener).toHaveBeenCalledTimes(1);
});
