import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'forks',
    execArgv: ['--expose-gc'],
    coverage: {
      provider: 'v8',
    },
  },
  resolve: {
    alias: [
      { find: /^keck\/(.+)$/, replacement: path.resolve(__dirname, 'src/$1.ts') },
      { find: 'keck', replacement: path.resolve(__dirname, 'src/index.ts') },
    ],
  },
});
