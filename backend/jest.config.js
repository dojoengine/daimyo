export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  injectGlobals: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@electric-sql/pglite)/)'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/deploy-commands.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    // Business-critical logic must maintain high coverage
    './src/services/reputation.ts': {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
    './src/services/roleManager.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    './src/services/decay.ts': {
      statements: 85,
      branches: 80,
      functions: 90,
      lines: 85,
    },
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
