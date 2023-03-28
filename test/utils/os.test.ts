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
    ExecException
  };
});

jest.mock('../../src/logger', () => ({
  log: mockLoggerLog,
  error: mockLoggerError,
  info: mockLoggerInfo
}));

import {
  ExecOptions
} from 'child_process';
import {
  runCommand, streamToString
} from '../../src/utils/os';
import { Readable } from 'stream';

class ChildProcessStub {
  stdoutCb: (data: string) => void;
  stderrCb: (data: string) => void;
  childProcessErrorCb: (error: Error) => void;
  childProcessExitCb: (code: number, signal?: string) => void;
  stdout: {
    on: (_event: string, callback: (data: string) => void) => void
  };
  stderr: {
    on: (_event: string, callback: (data: string) => void) => void
  };

  constructor () {
    const self = this;
    this.stdout = {
      on (_event: string, callback: (data: string) => void) {
        self.stdoutCb = callback;
      }
    };
    this.stderr = {
      on (_event: string, callback: (data: string) => void) {
        self.stderrCb = callback;
      }
    };
  }
  on (event: string, callback: (...args: any) => void) {
    if (event === 'error') {
      this.childProcessErrorCb = callback;
    } else if (event === 'exit') {
      this.childProcessExitCb = callback;
    }
  }
}

let childProcessStub: ChildProcessStub;
function execStub (_command: string, _opts: ExecOptions) {
  childProcessStub = new ChildProcessStub();
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
});