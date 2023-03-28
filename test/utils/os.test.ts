import { MockChildProcess } from '../mocks/MockChildProcess';
const mockExec = jest.fn();
const mockPipe = jest.fn();
const mockLoggerLog = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('child_process', () => {
  const {
    ExecOptions,
    ExecException
  } = jest.requireActual('child_process');
  return {
    exec: mockExec,
    ExecOptions,
    ExecException,
    ChildProcess: MockChildProcess
  };
});

jest.mock('../../src/logger', () => ({
  log: mockLoggerLog,
  error: mockLoggerError,
  info: mockLoggerInfo
}));

import {
  ChildProcess,
  ExecOptions
} from 'child_process';
import {
  promisifyChildProcess,
  runCommand, streamToString
} from '../../src/utils/os';
import { Readable } from 'stream';

let childProcessStub: MockChildProcess;
function execStub (_command: string, _opts: ExecOptions) {
  childProcessStub = new MockChildProcess();
  return childProcessStub;
}

describe('os utils', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });

  describe('runCommand', () => {
    beforeEach(() => {
      process.env.MOCK_VAR = 'mock-var';
      jest.spyOn(global.process.stdin, 'pipe').mockImplementation(mockPipe);
      jest.spyOn(global.console, 'log').mockImplementation(jest.fn());
      jest.spyOn(global.console, 'error').mockImplementation(jest.fn());
      mockExec.mockImplementation(execStub);
    });

    it('combines env vars from options with env vars from process', async () => {
      const resultPromise = runCommand('mock command', {
        env: {
          TEST_VAR: 'test-var'
        }
      });
      const childProcess = childProcessStub;  
      childProcess.stdoutCb('data');
      childProcess.stderrCb('warning');
      childProcess.childProcessExitCb(0);
      await resultPromise;

      expect(mockLoggerLog).toBeCalled();
      expect(mockLoggerLog).toBeCalledTimes(1);
      expect(mockLoggerLog).toBeCalledWith('mock command');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith(
        'mock command',
        expect.any(Object)
      );
      expect(mockExec.mock.calls[0][1].env).toHaveProperty('MOCK_VAR', 'mock-var');
      expect(mockExec.mock.calls[0][1].env).toHaveProperty('TEST_VAR', 'test-var');

      expect(global.console.error).toBeCalled();
      expect(global.console.error).toBeCalledTimes(1);
      expect(global.console.error).toBeCalledWith('warning');
      
      expect(global.console.log).toBeCalled();
      expect(global.console.log).toBeCalledTimes(1);
      expect(global.console.log).toBeCalledWith('data');
    });
    it('rejects on error from child process', async () => {
      const mockError = { code: 1, name: 'ExecException', message: '' };

      let thrownError;
      try {
        const resultPromise = runCommand('mock command');
        const childProcess = childProcessStub;
        childProcess.childProcessErrorCb(mockError);
        childProcess.childProcessExitCb(0);
        await resultPromise;
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerLog).toBeCalled();
        expect(mockLoggerLog).toBeCalledTimes(1);
        expect(mockLoggerLog).toBeCalledWith('mock command');

        expect(mockExec).toBeCalled();
        expect(mockExec).toBeCalledTimes(1);
        expect(mockExec).toBeCalledWith('mock command', undefined);

        expect(mockLoggerError).toBeCalled();
        expect(mockLoggerError).toBeCalledWith('Failed to execute command "mock command"');

        expect(thrownError).toBeDefined();
        expect(thrownError).toEqual(mockError);
      }
    });
    it('notifies of signal during exit', async () => {
      const resultPromise = runCommand('mock command');
      const childProcess = childProcessStub;  
      childProcess.childProcessExitCb(130, 'SIGINT');
      await resultPromise;

      expect(mockLoggerLog).toBeCalled();
      expect(mockLoggerLog).toBeCalledTimes(1);
      expect(mockLoggerLog).toBeCalledWith('mock command');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith('mock command', undefined);

      expect(mockLoggerInfo).toBeCalled();
      expect(mockLoggerInfo).toBeCalledTimes(1);
      expect(mockLoggerInfo).toBeCalledWith('Exited due to signal: SIGINT');
    });
    it('rejects on error from main process', async () => {
      const mockError = new Error('Error!');
      mockLoggerLog.mockImplementationOnce(() => { throw mockError; } );

      let thrownError;
      try {
        await runCommand('mock command');
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerLog).toBeCalled();
        expect(mockLoggerLog).toBeCalledTimes(1);
        expect(mockLoggerLog).toBeCalledWith('mock command');

        expect(mockExec).not.toBeCalled();

        expect(mockLoggerError).toBeCalled();
        expect(mockLoggerError).toBeCalledWith('Failed to execute command "mock command"');

        expect(thrownError).toBeDefined();
        expect(thrownError).toEqual(mockError);
      }
    });
  });

  describe('streamToString', () => {
    it('iterates over Readable\'s generator and returns a single string', async () => {
      const readable: Readable = Readable.from([
        'This',
        'Is',
        'A',
        'Test',
        'String'
      ]);

      const result = await streamToString(readable);

      expect(result).toEqual('ThisIsATestString');
    });
  });

  describe('promisifyChildProcess', () => {
    it('adds new event listeners and returns promise to resolve output', async () => {
      const mockChildProcess = new MockChildProcess();
      const onOverride = ((event: string, callback: (...args: any) => void) => {
        if (event === 'error') {
          // @ts-ignore
          this.childProcessErrorCb = callback;
        } else if (event === 'exit') {
          // @ts-ignore
          this.childProcessExitCb = callback;
          // @ts-ignore
          this.childProcessExitCb(0);
        }
      }).bind(mockChildProcess);
      jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);

      const result = await promisifyChildProcess(mockChildProcess as unknown as ChildProcess)
      expect(result).toHaveProperty('stdout', '');
      expect(result).toHaveProperty('stderr', '');
      expect(result).toHaveProperty('exitCode', 0);
    });
    it('rejects if an error event is emitted', async () => {
      const mockError = new Error('Error!');
      const mockChildProcess = new MockChildProcess();
      const onOverride = ((event: string, callback: (...args: any) => void) => {
        if (event === 'error') {
          // @ts-ignore
          this.childProcessErrorCb = callback;
          // @ts-ignore
          this.childProcessErrorCb(mockError)
        } else if (event === 'exit') {
          // @ts-ignore
          this.childProcessExitCb = callback;
        }
      }).bind(mockChildProcess);
      jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);

      let thrownError;
      try {
        await promisifyChildProcess(mockChildProcess as unknown as ChildProcess)
      } catch (error) {
        thrownError = error;
      } finally {
        expect(thrownError).toEqual(mockError);
      }
    });
    it('rejects if an exit event is emitted with non-zero code', async () => {
      const mockChildProcess = new MockChildProcess();
      const onOverride = ((event: string, callback: (...args: any) => void) => {
        if (event === 'error') {
          // @ts-ignore
          this.childProcessErrorCb = callback;
        } else if (event === 'exit') {
          // @ts-ignore
          this.childProcessExitCb = callback;
          // @ts-ignore
          this.childProcessExitCb(1);
        }
      }).bind(mockChildProcess);
      jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);

      let thrownError;
      try {
        await promisifyChildProcess(mockChildProcess as unknown as ChildProcess)
      } catch (error) {
        thrownError = error;
      } finally {
        expect(thrownError).toHaveProperty('stdout', '');
        expect(thrownError).toHaveProperty('stderr', '');
        expect(thrownError).toHaveProperty('exitCode', 1);
      }
    });
  });
});