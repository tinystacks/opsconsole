const mockMkdirSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockPrompts = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('fs', () => ({
  mkdirSync: mockMkdirSync,
  writeFileSync: mockWriteFileSync
}));

jest.mock('prompts', () => {
  const original = jest.requireActual('prompts');
  return {
    __esModule: true,
    default: mockPrompts,
    PromptObject: original.PromptObject
  };
});

jest.mock('../../src/logger', () => ({
  error: mockLoggerError
}))

import { login } from '../../src/commands/login';

describe('login', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('prompts for api key and writes to file in private directory', async () => {
    const mockCredentials = { apiKey: 'mock-api-key' };
    mockPrompts.mockResolvedValueOnce(mockCredentials);

    await login();

    expect(mockMkdirSync).toBeCalled();
    expect(mockMkdirSync).toBeCalledWith('/tmp/.ops-console', { recursive: true });

    expect(mockPrompts).toBeCalled();

    expect(mockWriteFileSync).toBeCalled();
    expect(mockWriteFileSync).toBeCalledWith('/tmp/.ops-console/credentials', JSON.stringify(mockCredentials));
  });
  it('logs error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockMkdirSync.mockImplementationOnce(() => { throw mockError; });

    await login();

    expect(mockMkdirSync).toBeCalled();
    expect(mockPrompts).not.toBeCalled();
    expect(mockWriteFileSync).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`An error occured during login: ${mockError}`);
  });
});