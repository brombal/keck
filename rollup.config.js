import ts from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';
import { minify } from 'terser';
import tsConfig from './tsconfig.json' with { type: 'json' };

const dtsPlugin = dts({
  compilerOptions: { paths: tsConfig.compilerOptions.paths },
});

// Minifies output in-memory to report compressed size, but does not write minified output.
function minifiedSize() {
  return {
    name: 'minified-size',
    async generateBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') continue;
        const result = await minify(chunk.code, { sourceMap: false });
        const minBytes = Buffer.byteLength(result.code, 'utf8');
        const gzipBytes = (await import('node:zlib')).gzipSync(result.code).byteLength;
        console.log(
          `${fileName}: ${(minBytes / 1024).toFixed(2)} kB min / ${(gzipBytes / 1024).toFixed(2)} kB gz`,
        );
      }
    },
  };
}

export default [
  {
    input: 'src/index.ts',
    output: {
      file: './index.js',
      sourcemap: true,
    },
    plugins: [ts(), minifiedSize()],
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
    plugins: [ts(), minifiedSize()],
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
