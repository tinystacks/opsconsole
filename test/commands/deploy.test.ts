const mockReadFileSync = jest.fn();
const mockOpsStackApiClient = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerStdout = jest.fn();
const mockLoggerSuccess = jest.fn();
const mockResolve = jest.fn();
const mockParseConfig = jest.fn();
const mockGetOpsStack = jest.fn();
const mockCreateOpsStack = jest.fn();
const mockUpdateOpsStack = jest.fn();

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

jest.mock('@tinystacks/ops-stack-client', () => {
  const original = jest.requireActual('@tinystacks/ops-stack-client');
  return {
    OpsStackApiClient: mockOpsStackApiClient,
    OpenAPIConfig: original.OpenAPIConfig,
    HostedOpsConsole: original.HostedOpsConsole
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

import { deploy } from '../../src/commands/deploy';


const mockConfigYaml = 'Console: name: console';
const mockConfigJson = { name: 'console' };
const mockOpsStack = { name: 'console', status: 'Syncing' };
const mockCredentials = { apiKey: 'mock-api-key' };

describe('deploy', () => {
  beforeEach(() => {
    mockOpsStackApiClient.mockReturnValue({
      allocate: {
        getOpsStack: mockGetOpsStack,
        createOpsStack: mockCreateOpsStack,
        updateOpsStack: mockUpdateOpsStack
      }
    });
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
    mockReadFileSync.mockReturnValueOnce(JSON.stringify(mockCredentials));
    mockParseConfig.mockResolvedValueOnce(mockConfigJson);
    mockGetOpsStack.mockRejectedValueOnce({ status: 404 });
    mockCreateOpsStack.mockResolvedValueOnce(mockOpsStack);

    await deploy({ configFile: 'index.yml' });

    expect(mockResolve).toBeCalled()
    expect(mockResolve).toBeCalledWith('index.yml');

    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledTimes(2);
    expect(mockReadFileSync).toBeCalledWith('index.yml');
    expect(mockReadFileSync).toBeCalledWith('/tmp/.ops-console/credentials');
    
    expect(mockParseConfig).toBeCalled();
    expect(mockParseConfig).toBeCalledWith('index.yml');

    expect(mockOpsStackApiClient).toBeCalled();
    expect(mockOpsStackApiClient).toBeCalledWith({
      BASE: 'https://rbxfvmjh4e.execute-api.us-west-2.amazonaws.com',
      HEADERS: {
        authorization: 'mock-api-key'
      }
    });

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
    mockReadFileSync.mockReturnValueOnce(JSON.stringify(mockCredentials));
    mockParseConfig.mockResolvedValueOnce(mockConfigJson);
    mockGetOpsStack.mockResolvedValueOnce(mockOpsStack);
    mockUpdateOpsStack.mockResolvedValueOnce(mockOpsStack);

    await deploy({});

    expect(mockResolve).toBeCalled()
    expect(mockResolve).toBeCalledWith(defaultPath);

    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledTimes(2);
    expect(mockReadFileSync).toBeCalledWith(defaultPath);
    expect(mockReadFileSync).toBeCalledWith('/tmp/.ops-console/credentials');
    
    expect(mockParseConfig).toBeCalled();
    expect(mockParseConfig).toBeCalledWith(defaultPath);

    expect(mockOpsStackApiClient).toBeCalled();
    expect(mockOpsStackApiClient).toBeCalledWith({
      BASE: 'https://rbxfvmjh4e.execute-api.us-west-2.amazonaws.com',
      HEADERS: {
        authorization: 'mock-api-key'
      }
    });

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
    expect(mockOpsStackApiClient).not.toBeCalled();
    expect(mockCreateOpsStack).not.toBeCalled();
    expect(mockUpdateOpsStack).not.toBeCalled();
    expect(mockLoggerSuccess).not.toBeCalled();    
    expect(mockLoggerStdout).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error deploying ops console: ${mockError}`);
  });
});