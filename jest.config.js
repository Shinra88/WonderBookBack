module.exports = {
  testEnvironment: 'node',
  verbose: true,

  collectCoverage: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!node_modules/**',
    '!coverage/**',
    '!server.js'
  ],

  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  coverageDirectory: 'coverage',

  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },

  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,

  testMatch: ['**/tests/**/*.test.js']
};
