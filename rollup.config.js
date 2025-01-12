import ts from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import tsConfig from './tsconfig.json' with { type: 'json' };

const dtsPlugin = dts({
  compilerOptions: { paths: tsConfig.compilerOptions.paths },
});

export default [
  {
    input: 'src/index.ts',
    output: {
      file: './index.js',
      sourcemap: true,
    },
    plugins: [ts()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: './index.d.ts',
    },
    plugins: [dtsPlugin],
  },
  {
    input: 'src/react.ts',
    output: {
      file: './react.js',
      sourcemap: true,
    },
    external: ['keck', 'react'],
    plugins: [ts()],
  },
  {
    input: 'src/react.ts',
    output: {
      file: './react.d.ts',
    },
    external: ['keck', 'react'],
    plugins: [dtsPlugin],
  },
];
