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
  transform: {},
  coveragePathIgnorePatterns: [
    "src/index.ts",
    "src/commands/index.ts",
    "src/types/index.ts",
    "src/utils/ops-stack-api-utils/get-client.ts",
    "src/utils/ops-stack-api-utils/index.ts",
    "src/utils/ops-core/index.ts"
  ]
};