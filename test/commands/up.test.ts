const mockResolve = jest.fn();
const mockDirname = jest.fn();
const mockBasename = jest.fn();
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockUnlink = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerSucces = jest.fn();
const mockLoggerInfo = jest.fn();
const mockRunCommand = jest.fn();
const mockRunCommandSync = jest.fn();
const mockPromisifyChildProcess = jest.fn();
const mockS3 = jest.fn();
const mockGetObject = jest.fn();
const mockLoad = jest.fn();
const mockParse = jest.fn();
const mockStreamToFile = jest.fn();
const mockReplaceFromInDockerFile = jest.fn();
const mockGetConsoleParser = jest.fn();
const mockLogAndThrow = jest.fn();
const mockParseConfig = jest.fn();
const mockValidateDependencies = jest.fn();
const mockGetOpen = jest.fn();
const mockOpen = jest.fn();
const mockIsPortAvailable = jest.fn();

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: mockResolve,
  dirname: mockDirname,
  basename: mockBasename
}));

jest.mock('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  unlink: mockUnlink
}));

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  success: mockLoggerSucces,
  info: mockLoggerInfo
}))

jest.mock('../../src/utils/os', () => ({
  runCommand: mockRunCommand,
  runCommandSync: mockRunCommandSync,
  promisifyChildProcess: mockPromisifyChildProcess,
  streamToFile: mockStreamToFile,
  replaceFromInDockerFile: mockReplaceFromInDockerFile,
  logAndThrow: mockLogAndThrow,
  isPortAvailable: mockIsPortAvailable
}));

jest.mock('../../src/utils/config', () => ({
  parseConfig: mockParseConfig,
  validateDependencies: mockValidateDependencies
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3: mockS3
}));

jest.mock('js-yaml', () => ({
  load: mockLoad
}));

jest.mock('../../src/utils/ops-core', () => ({
  getConsoleParser: mockGetConsoleParser
}));

jest.mock('../../src/utils/open', () => ({
  getOpen: mockGetOpen
}));

const mockConsoleParser = {
  parse: mockParse
};

const mockS3Client = {
  getObject: mockGetObject
};

const mockOpenDefault = {
  default: mockOpen
}

jest.mock('process', () => {
  const process = jest.requireActual('process');
  process.platform = 'darwin';
  return process;
});

import { up } from '../../src/commands/up';
import { DEFAULT_CONFIG_FILENAME } from '../../src/constants';
import { ImageArchitecture } from '../../src/types';
import { MockChildProcess } from '../mocks/MockChildProcess';

describe('up', () => {
  beforeEach(() => {
    mockS3.mockReturnValue(mockS3Client);
    mockGetConsoleParser.mockResolvedValue(mockConsoleParser);
    mockGetOpen.mockResolvedValue(mockOpenDefault);
  });
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('logs and throws an error if the config file does not exist', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(false);

    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');

    expect(mockLogAndThrow).toBeCalled();
    expect(mockLogAndThrow).toBeCalledWith('Specified config file ./config.yml does not exist.');
  });
  it('logs and throws an error if ports are in use', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockIsPortAvailable.mockResolvedValueOnce(false);
    mockIsPortAvailable.mockResolvedValueOnce(false);


    await up({});

    expect(mockIsPortAvailable).toBeCalled();
    expect(mockIsPortAvailable).toBeCalledTimes(2);
    expect(mockIsPortAvailable).toBeCalledWith(8000);
    expect(mockIsPortAvailable).toBeCalledWith(3000);

    expect(mockLogAndThrow).toBeCalled();
    expect(mockLogAndThrow).toBeCalledWith(`The following port(s) are not available: 8000, 3000`);
  });
  it ('logs and throws an error if dependencies do not exist', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockIsPortAvailable.mockResolvedValue(true);
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    const validationError = new Error('Error');
    mockValidateDependencies.mockRejectedValue(validationError);
    const logAndThrowError = new Error('Error');
    mockLogAndThrow.mockImplementation(() => { throw logAndThrowError });

    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');
    
    expect(mockDirname).toBeCalled();
    expect(mockDirname).toBeCalledWith('./config.yml');
    
    expect(mockBasename).toBeCalled();
    expect(mockBasename).toBeCalledWith('./config.yml');

    expect(mockLogAndThrow).toBeCalled();
    expect(mockLogAndThrow).toBeCalledTimes(1);
    expect(mockLogAndThrow).toBeCalledWith('Failed to install dependencies. Please verify that your yaml template is formatted correctly.', validationError);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith('ops-cli up failed! To debug, please run with the -V, --verbose flag', logAndThrowError);
  });
  it('logs and throws an error if the network fails to start', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockIsPortAvailable.mockResolvedValue(true);
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    mockValidateDependencies.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({ Body: '' });
    const logAndThrowError = new Error('Error');
    mockLogAndThrow.mockImplementation(() => { throw logAndThrowError });
    const runCommandSyncError = {
      exitCode: 1,
      stdout: '',
      stderr: 'Error!'
    }
    mockRunCommandSync.mockRejectedValueOnce(runCommandSyncError);
    
    await up({});

    expect(mockResolve).toBeCalled();
    expect(mockResolve).toBeCalledWith(`${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);

    expect(mockExistsSync).toBeCalled();
    expect(mockExistsSync).toBeCalledWith('./config.yml');
    
    expect(mockDirname).toBeCalled();
    expect(mockDirname).toBeCalledWith('./config.yml');
    
    expect(mockBasename).toBeCalled();
    expect(mockBasename).toBeCalledWith('./config.yml');

    expect(mockRunCommandSync).toBeCalled();
    expect(mockRunCommandSync).toBeCalledTimes(1);

    expect(mockLogAndThrow).toBeCalled();
    expect(mockLogAndThrow).toBeCalledTimes(1);
    expect(mockLogAndThrow).toBeCalledWith('Failed to launch ops console docker network!', runCommandSyncError);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith('ops-cli up failed! To debug, please run with the -V, --verbose flag', logAndThrowError);
  });
  it('validates inputs, starts network, and runs api and ui images', async () => {
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockIsPortAvailable.mockResolvedValue(true);
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    mockValidateDependencies.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({ Body: '' });
    mockRunCommandSync.mockResolvedValueOnce({
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
    expect(mockRunCommand).toBeCalledTimes(2);

    expect(mockLoggerError).not.toBeCalled();

    expect(mockLoggerSucces).toBeCalled();
    expect(mockLoggerSucces).toBeCalledTimes(3);
    expect(mockLoggerSucces).toBeCalledWith('Dependencies validated!');
    expect(mockLoggerSucces).toBeCalledWith('Ops console backend is now running on http://0.0.0.0:8000');
    expect(mockLoggerSucces).toBeCalledWith('Ops console frontend is now running on http://0.0.0.0:3000');
    expect(mockOpen).toBeCalled();
  });
  describe('validates architecture', () => {
    it('x86', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./');
      mockBasename.mockReturnValue('config.yml');
      mockReadFileSync.mockReturnValue('');
      mockLoad.mockReturnValue({});
      mockParseConfig.mockReturnValue({ dependencies: {} });
      mockValidateDependencies.mockResolvedValueOnce(undefined);
      mockGetObject.mockResolvedValue({ Body: '' });
      mockRunCommandSync.mockResolvedValueOnce({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });
      const mockOpsApiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
      const mockOpsUiChildProcess = new MockChildProcess();
      mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
      
      await up({
        arch: 'x86' as ImageArchitecture
      });

      expect(mockRunCommandSync).toBeCalled();
      expect(mockRunCommandSync).toBeCalledTimes(1);

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(2);

      expect(mockReplaceFromInDockerFile).toBeCalled();
      expect(mockReplaceFromInDockerFile).toBeCalledTimes(2);
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.api', 'x86');
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.ui', 'x86');

      expect(mockLoggerError).not.toBeCalled();
    });
    it('x64', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./');
      mockBasename.mockReturnValue('config.yml');
      mockReadFileSync.mockReturnValue('');
      mockLoad.mockReturnValue({});
      mockParseConfig.mockReturnValue({ dependencies: {} });
      mockValidateDependencies.mockResolvedValueOnce(undefined);
      mockGetObject.mockResolvedValue({ Body: '' });
      mockRunCommandSync.mockResolvedValueOnce({
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

      expect(mockRunCommandSync).toBeCalled();
      expect(mockRunCommandSync).toBeCalledTimes(1);

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(2);

      expect(mockReplaceFromInDockerFile).toBeCalled();
      expect(mockReplaceFromInDockerFile).toBeCalledTimes(2);
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.api', 'x86');
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.ui', 'x86');

      expect(mockLoggerError).not.toBeCalled();
    });
    it('ia32', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./');
      mockBasename.mockReturnValue('config.yml');
      mockReadFileSync.mockReturnValue('');
      mockLoad.mockReturnValue({});
      mockParseConfig.mockResolvedValue({ dependencies: {} });
      mockValidateDependencies.mockResolvedValue(undefined);
      mockGetObject.mockResolvedValue({ Body: '' });
      mockRunCommandSync.mockResolvedValueOnce({
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

      expect(mockRunCommandSync).toBeCalled();
      expect(mockRunCommandSync).toBeCalledTimes(1);

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(2);

      expect(mockReplaceFromInDockerFile).toBeCalled();
      expect(mockReplaceFromInDockerFile).toBeCalledTimes(2);
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.api', 'x86');
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.ui', 'x86');

      expect(mockLoggerError).not.toBeCalled();
    });
    it('arm', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./');
      mockBasename.mockReturnValue('config.yml');
      mockReadFileSync.mockReturnValue('');
      mockLoad.mockReturnValue({});
      mockParseConfig.mockResolvedValue({ dependencies: {} });
      mockValidateDependencies.mockResolvedValue(undefined);
      mockGetObject.mockResolvedValue({ Body: '' });
      mockRunCommandSync.mockReturnValueOnce({
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

      expect(mockRunCommandSync).toBeCalled();
      expect(mockRunCommandSync).toBeCalledTimes(1);

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(2);

      expect(mockReplaceFromInDockerFile).toBeCalled();
      expect(mockReplaceFromInDockerFile).toBeCalledTimes(2);
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.api', 'arm');
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.ui', 'arm');

      expect(mockLoggerError).not.toBeCalled();
    });
    it('arm64', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./');
      mockBasename.mockReturnValue('config.yml');
      mockReadFileSync.mockReturnValue('');
      mockLoad.mockReturnValue({});
      mockParseConfig.mockResolvedValue({ dependencies: {} });
      mockValidateDependencies.mockResolvedValue(undefined);
      mockGetObject.mockResolvedValue({ Body: '' });
      mockRunCommandSync.mockResolvedValueOnce({
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

      expect(mockRunCommandSync).toBeCalled();
      expect(mockRunCommandSync).toBeCalledTimes(1);

      expect(mockRunCommand).toBeCalled();
      expect(mockRunCommand).toBeCalledTimes(2);

      expect(mockReplaceFromInDockerFile).toBeCalled();
      expect(mockReplaceFromInDockerFile).toBeCalledTimes(2);
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.api', 'arm');
      expect(mockReplaceFromInDockerFile).toBeCalledWith('Dockerfile.ui', 'arm');

      expect(mockLoggerError).not.toBeCalled();
    });
    it('throws for unsupported architecture', async () => {
      mockResolve.mockReturnValue('./config.yml');
      mockExistsSync.mockReturnValue(true);
      mockDirname.mockReturnValue('./');
      mockBasename.mockReturnValue('config.yml');
      mockReadFileSync.mockReturnValue('');
      mockLoad.mockReturnValue({});
      const logAndThrowError = new Error('Error!');
      mockLogAndThrow.mockImplementation(() => { throw logAndThrowError });
      mockParseConfig.mockReturnValue({ dependencies: {} });
      mockValidateDependencies.mockResolvedValue(undefined);
      mockGetObject.mockResolvedValue({ Body: '' });
      mockRunCommandSync.mockResolvedValueOnce({
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

      expect(mockRunCommandSync).not.toBeCalled();

      expect(mockRunCommand).not.toBeCalled();

      expect(mockLogAndThrow).toBeCalled();
      expect(mockLogAndThrow).toBeCalledWith('ops does not currently support mips');

      expect(mockLoggerError).toBeCalled();
      expect(mockLoggerError).toBeCalledWith('ops-cli up failed! To debug, please run with the -V, --verbose flag', logAndThrowError);
    });
  });
  it('set cleanup handlers', async () => {
    const mockEventOn = jest.fn();
    let eventCallbacks: Set<{(): any}> = new Set();
    mockEventOn.mockImplementation((event, cb) => { eventCallbacks.add(cb) });
    jest.spyOn(process, 'on').mockImplementation(mockEventOn);
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    mockValidateDependencies.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({ Body: '' });
    mockRunCommandSync.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockOpsApiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
    const mockOpsUiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);
    
    await up({});

    expect(mockEventOn).toBeCalled();
    expect(mockEventOn).toBeCalledTimes(6);
    expect(mockEventOn).toBeCalledWith('SIGINT', expect.any(Function));
    expect(mockEventOn).toBeCalledWith('SIGQUIT', expect.any(Function));
    expect(mockEventOn).toBeCalledWith('SIGTERM', expect.any(Function));
    expect(mockEventOn).toBeCalledWith('SIGINT', expect.any(Function));
    expect(mockEventOn).toBeCalledWith('SIGQUIT', expect.any(Function));
    expect(mockEventOn).toBeCalledWith('SIGTERM', expect.any(Function));


    expect(eventCallbacks.size).toEqual(2);
    eventCallbacks.forEach((callback) => { callback() })

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Cleaning up...');

    expect(mockUnlink).toBeCalled();
    expect(mockUnlink).toBeCalledTimes(2);
    expect(mockUnlink).toBeCalledWith('Dockerfile.api', expect.any(Function));
    expect(mockUnlink).toBeCalledWith('Dockerfile.ui', expect.any(Function));

    expect(mockOpsApiChildProcess.kill).toBeCalled();
    
    expect(mockOpsUiChildProcess.kill).toBeCalled();

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    expect(mockRunCommand.mock.calls[2][0]).toEqual('docker stop ops-frontend ops-api || true && docker network rm ops-console || true');
  });
  it('error on backend', async () => {
    const mockEventOn = jest.fn();
    let eventCallbacks: Set<{(): any}> = new Set();
    mockEventOn.mockImplementation((event, cb) => { eventCallbacks.add(cb) });
    jest.spyOn(process, 'on').mockImplementation(mockEventOn);
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    mockValidateDependencies.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({ Body: '' });
    mockRunCommandSync.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockOpsApiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
    const mockOpsUiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);

    const mockError = { code: 1, name: 'ExecException', message: '' };

    await up({});
    mockOpsApiChildProcess.childProcessErrorCb(mockError);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith('Failed to launch ops console backend!');

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Cleaning up...');

    expect(mockUnlink).toBeCalled();
    expect(mockUnlink).toBeCalledTimes(2);
    expect(mockUnlink).toBeCalledWith('Dockerfile.api', expect.any(Function));
    expect(mockUnlink).toBeCalledWith('Dockerfile.ui', expect.any(Function));

    expect(mockOpsApiChildProcess.kill).toBeCalled();
    
    expect(mockOpsUiChildProcess.kill).toBeCalled();

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    expect(mockRunCommand.mock.calls[2][0]).toEqual('docker stop ops-frontend ops-api || true && docker network rm ops-console || true');
  });
  it('error on frontend', async () => {
    const mockEventOn = jest.fn();
    let eventCallbacks: Set<{(): any}> = new Set();
    mockEventOn.mockImplementation((event, cb) => { eventCallbacks.add(cb) });
    jest.spyOn(process, 'on').mockImplementation(mockEventOn);
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    mockValidateDependencies.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({ Body: '' });
    mockRunCommandSync.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockOpsApiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
    const mockOpsUiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);

    const mockError = { code: 1, name: 'ExecException', message: '' };

    await up({});
    mockOpsUiChildProcess.childProcessErrorCb(mockError);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith('Failed to launch ops console frontend!');

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Cleaning up...');

    expect(mockUnlink).toBeCalled();
    expect(mockUnlink).toBeCalledTimes(2);
    expect(mockUnlink).toBeCalledWith('Dockerfile.api', expect.any(Function));
    expect(mockUnlink).toBeCalledWith('Dockerfile.ui', expect.any(Function));

    expect(mockOpsApiChildProcess.kill).toBeCalled();
    
    expect(mockOpsUiChildProcess.kill).toBeCalled();

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    expect(mockRunCommand.mock.calls[2][0]).toEqual('docker stop ops-frontend ops-api || true && docker network rm ops-console || true');
  });
  it('exit on backend', async () => {
    const mockEventOn = jest.fn();
    let eventCallbacks: Set<{(): any}> = new Set();
    mockEventOn.mockImplementation((event, cb) => { eventCallbacks.add(cb) });
    jest.spyOn(process, 'on').mockImplementation(mockEventOn);
    mockResolve.mockReturnValue('./config.yml');
    mockExistsSync.mockReturnValue(true);
    mockDirname.mockReturnValue('./');
    mockBasename.mockReturnValue('config.yml');
    mockReadFileSync.mockReturnValue('');
    mockLoad.mockReturnValue({});
    mockParseConfig.mockResolvedValue({ dependencies: {} });
    mockValidateDependencies.mockResolvedValue(undefined);
    mockGetObject.mockResolvedValue({ Body: '' });
    mockRunCommandSync.mockResolvedValueOnce({
      exitCode: 0,
      stdout: '',
      stderr: ''
    });
    const mockOpsApiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsApiChildProcess);
    const mockOpsUiChildProcess = new MockChildProcess();
    mockRunCommand.mockReturnValueOnce(mockOpsUiChildProcess);

    await up({});
    mockOpsApiChildProcess.childProcessExitCb(1);

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledTimes(1);
    expect(mockLoggerError).toBeCalledWith('Backend exited with code 1');

    expect(mockLoggerInfo).toBeCalled();
    expect(mockLoggerInfo).toBeCalledWith('Cleaning up...');

    expect(mockUnlink).toBeCalled();
    expect(mockUnlink).toBeCalledTimes(2);
    expect(mockUnlink).toBeCalledWith('Dockerfile.api', expect.any(Function));
    expect(mockUnlink).toBeCalledWith('Dockerfile.ui', expect.any(Function));

    expect(mockOpsApiChildProcess.kill).toBeCalled();
    
    expect(mockOpsUiChildProcess.kill).toBeCalled();

    expect(mockRunCommand).toBeCalled();
    expect(mockRunCommand).toBeCalledTimes(3);
    expect(mockRunCommand.mock.calls[2][0]).toEqual('docker stop ops-frontend ops-api || true && docker network rm ops-console || true');
  });
});