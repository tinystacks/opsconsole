const mockReadFileSync = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerStdout = jest.fn();
const mockLoggerSuccess = jest.fn();
const mockResolve = jest.fn();
const mockParseConfig = jest.fn();
const mockGetOpsStack = jest.fn();
const mockCreateOpsStack = jest.fn();
const mockUpdateOpsStack = jest.fn();
const mockGetCredentials = jest.fn();
const mockGetClient = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync
}));

jest.mock('path', () => {
  const original = jest.requireActual('path');
  return {
    resolve: mockResolve,
    join: original.join
  };
});

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  stdout: mockLoggerStdout,
  success: mockLoggerSuccess
}));

jest.mock('../../src/utils/config', () => ({
  parseConfig: mockParseConfig
}));

jest.mock('../../src/utils/ops-stack-api-utils', () => ({
  getCredentials: mockGetCredentials,
  getClient: mockGetClient
}));

import { deploy } from '../../src/commands/deploy';


const mockConfigYaml = 'Console: name: console';
const mockConfigJson = { name: 'console' };
const mockOpsStack = { name: 'console', status: 'Syncing' };
const mockCredentials = { apiKey: 'mock-api-key' };

const mockOpsStackApiClient = {
  allocate: {
    getOpsStack: mockGetOpsStack,
    createOpsStack: mockCreateOpsStack,
    updateOpsStack: mockUpdateOpsStack
  }
};

describe('deploy', () => {
  beforeEach(() => {
    mockGetClient.mockReturnValue(mockOpsStackApiClient);
    mockGetCredentials.mockReturnValue(mockCredentials);
  });
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('creates new ops console stack if one does not already exist', async () => {
    mockResolve.mockImplementationOnce((filePath: string) => filePath);
    mockReadFileSync.mockReturnValueOnce(mockConfigYaml);
    mockParseConfig.mockResolvedValueOnce(mockConfigJson);
    mockGetOpsStack.mockRejectedValueOnce({ status: 404 });
    mockCreateOpsStack.mockResolvedValueOnce(mockOpsStack);

    await deploy({ configFile: 'index.yml' });

    expect(mockResolve).toBeCalled()
    expect(mockResolve).toBeCalledWith('index.yml');

    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith('index.yml');
    
    expect(mockParseConfig).toBeCalled();
    expect(mockParseConfig).toBeCalledWith('index.yml');

    expect(mockGetClient).toBeCalled();

    expect(mockCreateOpsStack).toBeCalled();
    expect(mockCreateOpsStack).toBeCalledWith(mockConfigYaml);

    expect(mockLoggerSuccess).toBeCalled();
    expect(mockLoggerSuccess).toBeCalledWith('Successful started ops console deployment!');
    
    expect(mockLoggerStdout).toBeCalled();
    expect(mockLoggerStdout).toBeCalledWith(JSON.stringify(mockOpsStack, null, 2));
  });
  it('updates the ops console stack if one already exists', async () => {
    const defaultPath = `${process.cwd()}/config.yml`
    mockResolve.mockImplementationOnce((filePath: string) => filePath);
    mockReadFileSync.mockReturnValueOnce(mockConfigYaml);
    mockParseConfig.mockResolvedValueOnce(mockConfigJson);
    mockGetOpsStack.mockResolvedValueOnce(mockOpsStack);
    mockUpdateOpsStack.mockResolvedValueOnce(mockOpsStack);

    await deploy({});

    expect(mockResolve).toBeCalled()
    expect(mockResolve).toBeCalledWith(defaultPath);

    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith(defaultPath);
    
    expect(mockParseConfig).toBeCalled();
    expect(mockParseConfig).toBeCalledWith(defaultPath);

    expect(mockGetClient).toBeCalled();

    expect(mockCreateOpsStack).not.toBeCalled();
    
    expect(mockUpdateOpsStack).toBeCalled();
    expect(mockUpdateOpsStack).toBeCalledWith('console', mockConfigYaml);

    expect(mockLoggerSuccess).toBeCalled();
    expect(mockLoggerSuccess).toBeCalledWith('Successful started ops console deployment!');
    
    expect(mockLoggerStdout).toBeCalled();
    expect(mockLoggerStdout).toBeCalledWith(JSON.stringify(mockOpsStack, null, 2));
  });
  it('logs error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockResolve.mockImplementation(() => { throw mockError; });

    await deploy({ configFile: 'index.yml' });

    expect(mockResolve).toBeCalled()

    expect(mockReadFileSync).not.toBeCalled();
    expect(mockParseConfig).not.toBeCalled();
    expect(mockGetClient).not.toBeCalled();
    expect(mockCreateOpsStack).not.toBeCalled();
    expect(mockUpdateOpsStack).not.toBeCalled();
    expect(mockLoggerSuccess).not.toBeCalled();    
    expect(mockLoggerStdout).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error deploying ops console: ${mockError}`);
  });
});