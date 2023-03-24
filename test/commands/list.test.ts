const mockReadFileSync = jest.fn();
const mockOpsStackApiClient = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerStdout = jest.fn();
const mockGetOpsStack = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync
}));

jest.mock('@tinystacks/ops-stack-client', () => {
  const original = jest.requireActual('@tinystacks/ops-stack-client');
  return {
    OpsStackApiClient: mockOpsStackApiClient,
    OpenAPIConfig: original.OpenAPIConfig
  };
});

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  stdout: mockLoggerStdout
}));

import { list } from '../../src/commands/list';

describe('list', () => {
  beforeEach(() => {
    mockOpsStackApiClient.mockReturnValue({
      allocate: {
        getOpsStack: mockGetOpsStack
      }
    });
  });
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('pulls credentials from local private file and calls getOpsStack through the client', async () => {
    mockReadFileSync.mockReturnValue('{ "apiKey": "mock-api-key" }');
    mockGetOpsStack.mockResolvedValue({ name: 'console' });

    await list();

    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith('/tmp/.ops-console/credentials');

    expect(mockOpsStackApiClient).toBeCalled();
    expect(mockOpsStackApiClient).toBeCalledWith({
      BASE: 'https://rbxfvmjh4e.execute-api.us-west-2.amazonaws.com',
      HEADERS: {
        authorization: 'mock-api-key'
      }
    });

    expect(mockGetOpsStack).toBeCalled();

    expect(mockLoggerStdout).toBeCalled();
    expect(mockLoggerStdout).toBeCalledWith("{\n  \"name\": \"console\"\n}");
  });
  it('logs error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockReadFileSync.mockImplementationOnce(() => { throw mockError; });

    await list();

    expect(mockReadFileSync).toBeCalled();

    expect(mockOpsStackApiClient).not.toBeCalled();
    expect(mockGetOpsStack).not.toBeCalled();
    expect(mockLoggerStdout).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error listing ops consoles: ${mockError}`);
  });
});