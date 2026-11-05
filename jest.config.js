/**
 * jira-mcp-agent: Jest Configuration
 * Enforces >= 60.0% code coverage threshold across statements, branches, functions, and lines.
 *
 * @type {import('ts-jest').JestConfigWithTsJest}
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2022',
          module: 'commonjs',
          esModuleInterop: true,
          skipLibCheck: true,
        },
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',            // HTTP listen / boot entry point
    '!src/**/*.d.ts',
    '!src/types/**',            // Type declarations
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'json',
    'json-summary',
    'clover',
  ],
  coverageThreshold: {
    global: {
      statements: 60.0,
      branches: 60.0,
      functions: 60.0,
      lines: 60.0,
    },
  },
  testTimeout: 10000,
  verbose: true,
};
