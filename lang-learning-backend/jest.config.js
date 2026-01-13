module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.{js,tsx}'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
