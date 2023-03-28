const mockLoggerError = jest.fn();
const mockLoggerStdout = jest.fn();
const mockGetOpsStack = jest.fn();
const mockGetCredentials = jest.fn();
const mockGetClient = jest.fn();

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  stdout: mockLoggerStdout
}));

jest.mock('../../src/utils/ops-stack-api-utils', () => ({
  getCredentials: mockGetCredentials,
  getClient: mockGetClient
}));

import { list } from '../../src/commands/list';

const mockOpsStackClient = {
  allocate: {
    getOpsStack: mockGetOpsStack
  }
};

describe('list', () => {
  beforeEach(() => {
    mockGetClient.mockReturnValue(mockOpsStackClient);
  });
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('pulls credentials from local private file and calls getOpsStack through the client', async () => {
    mockGetCredentials.mockReturnValue('{ "apiKey": "mock-api-key" }');
    mockGetOpsStack.mockResolvedValue({ name: 'console' });

    await list();

    expect(mockGetCredentials).toBeCalled();

    expect(mockGetClient).toBeCalled();

    expect(mockGetOpsStack).toBeCalled();

    expect(mockLoggerStdout).toBeCalled();
    expect(mockLoggerStdout).toBeCalledWith("{\n  \"name\": \"console\"\n}");
  });
  it('throws an error if credentials are not found', async () => {
    mockGetCredentials.mockReturnValue('{ "apiKey": "mock-api-key" }');
    mockGetOpsStack.mockResolvedValue({ name: 'console' });

    await list();

    expect(mockGetCredentials).toBeCalled();

    expect(mockGetClient).toBeCalled();

    expect(mockGetOpsStack).toBeCalled();

    expect(mockLoggerStdout).toBeCalled();
    expect(mockLoggerStdout).toBeCalledWith("{\n  \"name\": \"console\"\n}");
  });
  it('logs error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockGetCredentials.mockImplementationOnce(() => { throw mockError; });

    await list();

    expect(mockGetCredentials).toBeCalled();

    expect(mockGetClient).not.toBeCalled();
    expect(mockGetOpsStack).not.toBeCalled();
    expect(mockLoggerStdout).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error listing ops consoles: ${mockError}`);
  });
});