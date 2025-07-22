module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!jest.config.js',
    '!eslint.config.js',
    '!server.js'
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/coverage/', '/dist/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
