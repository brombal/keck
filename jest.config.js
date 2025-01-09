/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  rootDir: './',
  moduleNameMapper: {
    '^keck$': '<rootDir>/src/index.ts',
    '^keck/(.*)': '<rootDir>/src/$1.ts'
  },
};