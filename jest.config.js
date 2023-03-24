// eslint-disable-next-line
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['.d.ts', '.js'],
  verbose: true,
  collectCoverageFrom: [
    "src/**/*.ts"
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  transform: {}
};