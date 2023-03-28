const mockResolve = jest.fn();
const mockDirname = jest.fn();
const mockBasename = jest.fn();
const mockExistsSync = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerSucces = jest.fn();
const mockRunCommand = jest.fn();
const mockPromisifyChildProcess = jest.fn();

jest.mock('path', () => ({
  resolve: mockResolve,
  dirname: mockDirname,
  basename: mockBasename
}));

jest.mock('fs', () => ({
  existsSync: mockExistsSync
}));

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  success: mockLoggerSucces
}))

jest.mock('../../src/utils/os', () => ({
  runCommand: mockRunCommand,
  promisifyChildProcess: mockPromisifyChildProcess
}));

import { up } from '../../src/commands/up';
import { DEFAULT_CONFIG_FILENAME } from '../../src/constants';
import { ImageArchitecture } from '../../src/types';
import { MockChildProcess } from '../mocks/MockChildProcess';

describe('up', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('throws an error if the config file does not exist', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(false);

    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith('Specified config file ./config.yml does not exist.');
  });
  it('logs an error if the network fails to start', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./')
    mockBasename.mockReturnValue('config.yml')
    const mockChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValue(mockChildProcess);
    mockPromisifyChildProcess.mockRejectedValueOnce({
      exitCode: 1,
      stdout: '',
      stderr: 'Error!'
    });
    
    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');
    
    expect(mockDirname).toBeCalled();
    expect(mockDirname).toBeCalledWith('./config.yml');
    
    expect(mockBasename).toBeCalled();
    expect(mockBasename).toBeCalledWith('./config.yml');

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(1);
    
    expect(mockPromisifyChildProcess).toBeCalled();
    expect(mockPromisifyChildProcess).toBeCalledTimes(1);
    expect(mockPromisifyChildProcess).toBeCalledWith(mockChildProcess);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(2);
    expect(mockLoggerError).toBeCalledWith('Error launching ops console network!');
    expect(mockLoggerError).toBeCalledWith('Commands to start docker network failed with exit code 1!\n\t stdout: \n\t stderr: Error!');
  });
  it('logs an error if ops-api fails to start', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./')
    mockBasename.mockReturnValue('config.yml')
    const mockNetworkChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
    mockPromisifyChildProcess.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockError = new Error('Error!');
    mockRunCommand.mockImplementationOnce(() => { throw mockError; });
    const mockOpsUiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
    
    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');
    
    expect(mockDirname).toBeCalled();
    expect(mockDirname).toBeCalledWith('./config.yml');
    
    expect(mockBasename).toBeCalled();
    expect(mockBasename).toBeCalledWith('./config.yml');

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    
    expect(mockPromisifyChildProcess).toBeCalled();
    expect(mockPromisifyChildProcess).toBeCalledTimes(1);
    expect(mockPromisifyChildProcess).toBeCalledWith(mockNetworkChildProcess);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith(`Error launching ops console backend: ${mockError}`);
  });
  it('logs an error if ops-ui fails to start', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./')
    mockBasename.mockReturnValue('config.yml')
    const mockNetworkChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
    mockPromisifyChildProcess.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockOpsApiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
    const mockError = new Error('Error!');
    mockRunCommand.mockImplementationOnce(() => { throw mockError; });
    
    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');
    
    expect(mockDirname).toBeCalled();
    expect(mockDirname).toBeCalledWith('./config.yml');
    
    expect(mockBasename).toBeCalled();
    expect(mockBasename).toBeCalledWith('./config.yml');

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    
    expect(mockPromisifyChildProcess).toBeCalled();
    expect(mockPromisifyChildProcess).toBeCalledTimes(1);
    expect(mockPromisifyChildProcess).toBeCalledWith(mockNetworkChildProcess);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith(`Error launching ops console frontend: ${mockError}`);
  });
  it('validates inputs, starts network, and runs api and ui images', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./')
    mockBasename.mockReturnValue('config.yml')
    const mockNetworkChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
    mockPromisifyChildProcess.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockOpsApiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
    const mockOpsUiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
    
    await up({});

    mockOpsApiChildProcess.stdoutCb('Running on http://localhost:8000');
    mockOpsUiChildProcess.stdoutCb('ready - started server on 0.0.0.0:3000');

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');
    
    expect(mockDirname).toBeCalled();
    expect(mockDirname).toBeCalledWith('./config.yml');
    
    expect(mockBasename).toBeCalled();
    expect(mockBasename).toBeCalledWith('./config.yml');

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    
    expect(mockPromisifyChildProcess).toBeCalled();
    expect(mockPromisifyChildProcess).toBeCalledTimes(1);
    expect(mockPromisifyChildProcess).toBeCalledWith(mockNetworkChildProcess);

    expect(mockLoggerError).not.toBeCalled();

    expect(mockLoggerSucces).toBeCalled();
    expect(mockLoggerSucces).toBeCalledTimes(2);
    expect(mockLoggerSucces).toBeCalledWith('Ops console backend successfully launched');
    expect(mockLoggerSucces).toBeCalledWith('Ops console frontend successfully launched');
  });
  describe('validates architecture', () => {
    it('x64', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./')
      mockBasename.mockReturnValue('config.yml')
      const mockNetworkChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
      mockPromisifyChildProcess.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });
      const mockOpsApiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
      const mockOpsUiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
      
      await up({
        arch: 'x64' as ImageArchitecture
      });

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(3);

      const apiCommands = mockRunCommand.mock.calls[1][0];
      expect(apiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-api:latest-x86;\n')).toBe(true);
      
      const uiCommands = mockRunCommand.mock.calls[2][0];
      expect(uiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-frontend:latest-x86;\n')).toBe(true);

      expect(mockLoggerError).not.toBeCalled();
    });
    it('ia32', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./')
      mockBasename.mockReturnValue('config.yml')
      const mockNetworkChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
      mockPromisifyChildProcess.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });
      const mockOpsApiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
      const mockOpsUiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
      
      await up({
        arch: 'ia32' as ImageArchitecture
      });

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(3);

      const apiCommands = mockRunCommand.mock.calls[1][0];
      expect(apiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-api:latest-x86;\n')).toBe(true);
      
      const uiCommands = mockRunCommand.mock.calls[2][0];
      expect(uiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-frontend:latest-x86;\n')).toBe(true);

      expect(mockLoggerError).not.toBeCalled();
    });
    it('arm', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./')
      mockBasename.mockReturnValue('config.yml')
      const mockNetworkChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
      mockPromisifyChildProcess.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });
      const mockOpsApiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
      const mockOpsUiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
      
      await up({
        arch: 'arm' as ImageArchitecture
      });

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(3);

      const apiCommands = mockRunCommand.mock.calls[1][0];
      expect(apiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-api:latest-arm;\n')).toBe(true);
      
      const uiCommands = mockRunCommand.mock.calls[2][0];
      expect(uiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-frontend:latest-arm;\n')).toBe(true);

      expect(mockLoggerError).not.toBeCalled();
    });
    it('arm64', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./')
      mockBasename.mockReturnValue('config.yml')
      const mockNetworkChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
      mockPromisifyChildProcess.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });
      const mockOpsApiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
      const mockOpsUiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
      
      await up({
        arch: 'arm64' as ImageArchitecture
      });

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(3);

      const apiCommands = mockRunCommand.mock.calls[1][0];
      expect(apiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-api:latest-arm;\n')).toBe(true);
      
      const uiCommands = mockRunCommand.mock.calls[2][0];
      expect(uiCommands.startsWith('docker pull public.ecr.aws/tinystacks/ops-frontend:latest-arm;\n')).toBe(true);

      expect(mockLoggerError).not.toBeCalled();
    });
    it('throws for unsupported architecture', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./')
      mockBasename.mockReturnValue('config.yml')
      const mockNetworkChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockNetworkChildProcess);
      mockPromisifyChildProcess.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });
      const mockOpsApiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
      const mockOpsUiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
      
      await up({
        arch: 'mips' as ImageArchitecture
      });

      expect(mockRunCommand).not.toBeCalled();

      expect(mockLoggerError).toBeCalled();
      expect(mockLoggerError).toBeCalledWith('ops does not currently support mips');
    });
  });
});