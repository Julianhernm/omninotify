/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/../__mocks__/uuid.js',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
      },
    }],
  },
  // Evita que Jest trate rejections no capturadas como errores de test
  fakeTimers: {
    enableGlobally: false,
  },
};