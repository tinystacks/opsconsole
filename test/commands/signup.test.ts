const mockExecSync = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('child_process', () => ({
  execSync: mockExecSync
}));

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  info: mockLoggerInfo
}))

import { signup } from '../../src/commands/signup';

describe('signup', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('logs an error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockExecSync.mockImplementationOnce(() => { throw mockError; });

    await signup({ os: 'darwin' });

    expect(mockExecSync).toBeCalled();
    expect(mockExecSync).toBeCalledWith('open https://ops.tinystacks.com');

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Opening https://ops.tinystacks.com in your default browser...');
    
    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error during signup: ${mockError}`);
  });
  it('opens url with start for windows', async () => {
    await signup({ os: 'win32' });

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Opening https://ops.tinystacks.com in your default browser...');

    expect(mockExecSync).toBeCalled();
    expect(mockExecSync).toBeCalledWith('start https://ops.tinystacks.com');
  });
  it('opens url with xdg-open for linux', async () => {
    await signup({ os: 'linux' });

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Opening https://ops.tinystacks.com in your default browser...');

    expect(mockExecSync).toBeCalled();
    expect(mockExecSync).toBeCalledWith('xdg-open https://ops.tinystacks.com');
  });
});