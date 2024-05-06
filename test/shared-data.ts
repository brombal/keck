export const createData = () => ({
  value1: "value1",
  value2: 0,
  value3: true,
  object1: {
    value1: "object1-value1",
    value2: "object1-value2",
    value3: undefined,
    value4: 0,
    value5: {
      value1: "object1-value5-value1",
      value2: "object1-value5-value2",
    },
  },
  object2: {
    value1: "object2-value1",
    value2: "object2-value2",
    value3: {
      value1: "object1-value5-value1",
      value2: "object1-value5-value2",
    },
  },
  object3: {
    value1: "object3-value1",
    value2: "object3-value2",
  },
  array1: [
    { value1: "array1-0-value1", value2: "array1-0-value2" },
    { value1: "array1-1-value1", value2: "array1-1-value2" },
    { value1: "array1-2-value1", value2: "array1-2-value2" },
  ],
  array2: [
    { value1: "array2-0-value1", value2: "array2-0-value2" },
    { value1: "array2-1-value1", value2: "array2-1-value2" },
    { value1: "array2-2-value1", value2: "array2-2-value2" },
  ],
});
