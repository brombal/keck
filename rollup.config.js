import ts from "rollup-plugin-ts";

export default [
  {
    input: "src/index.ts",
    output: {
      file: "./index.js",
      sourcemap: true,
    },
    plugins: [ts()],
  },
  {
    input: "src/react.ts",
    output: {
      file: "./react.js",
      sourcemap: true,
    },
    external: ["keck", "react"],
    plugins: [ts()],
  },
];
