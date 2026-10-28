/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Any file named *.test.ts or *.test.tsx is a test, wherever it lives.
  testMatch: ['**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
};
