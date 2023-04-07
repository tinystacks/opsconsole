import { MockChildProcess } from '../mocks/MockChildProcess';
const mockExec = jest.fn();
const mockPipe = jest.fn();
const mockLoggerLog = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerInfo = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockCreateWriteStream = jest.fn();
const mockLoggerVerbose = jest.fn();

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
  info: mockLoggerInfo,
  verbose: mockLoggerVerbose
}));

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  createWriteStream: mockCreateWriteStream
}));

import {
  ChildProcess,
  ExecOptions
} from 'child_process';
import {
  replaceFromInDockerFile,
  runCommand, runCommandSync, streamToFile, streamToString
} from '../../src/utils/os';
import { Readable } from 'stream';

let childProcessStub: MockChildProcess;
function execStub (_command: string, _opts: ExecOptions) {
  childProcessStub = new MockChildProcess();
  return childProcessStub;
}

describe('os utils', () => {
  beforeEach(() => {
    jest.spyOn(global.console, 'error').mockImplementation(jest.fn());
  });
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

      expect(mockLoggerVerbose).toBeCalled();
      expect(mockLoggerVerbose).toBeCalledTimes(3);
      expect(mockLoggerVerbose).toBeCalledWith('mock command');
      expect(mockLoggerVerbose).toBeCalledWith('data');
      expect(mockLoggerVerbose).toBeCalledWith('warning');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith(
        'mock command',
        expect.any(Object)
      );
      expect(mockExec.mock.calls[0][1].env).toHaveProperty('MOCK_VAR', 'mock-var');
      expect(mockExec.mock.calls[0][1].env).toHaveProperty('TEST_VAR', 'test-var');
    });
    it('logs on error from child process', async () => {
      const mockError = { code: 1, name: 'ExecException', message: '' };

      runCommand('mock command');
      const childProcess = childProcessStub;
      childProcess.childProcessErrorCb(mockError);
      childProcess.childProcessExitCb(0);

      expect(mockLoggerVerbose).toBeCalled();
      expect(mockLoggerVerbose).toBeCalledTimes(2);
      expect(mockLoggerVerbose).toBeCalledWith('mock command');
      expect(mockLoggerVerbose).toBeCalledWith('Failed to execute command:\nmock command\nError: ');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith('mock command', undefined);
    });
    it('notifies of signal during exit', async () => {
      runCommand('mock command');
      const childProcess = childProcessStub;  
      childProcess.childProcessExitCb(130, 'SIGINT');

      expect(mockLoggerVerbose).toBeCalled();
      expect(mockLoggerVerbose).toBeCalledTimes(3);
      expect(mockLoggerVerbose).toBeCalledWith('mock command');
      expect(mockLoggerVerbose).toBeCalledWith('The following command(s) exited with code: 130\nmock command')
      expect(mockLoggerVerbose).toBeCalledWith('Exited due to signal: SIGINT');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith('mock command', undefined);
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

  // describe('promisifyChildProcess', () => {
  //   it('adds new event listeners and returns promise to resolve output', async () => {
  //     const mockChildProcess = new MockChildProcess();
  //     const onOverride = ((event: string, callback: (...args: any) => void) => {
  //       if (event === 'error') {
  //         // @ts-ignore
  //         this.childProcessErrorCb = callback;
  //       } else if (event === 'exit') {
  //         // @ts-ignore
  //         this.childProcessExitCb = callback;
  //         // @ts-ignore
  //         this.childProcessExitCb(0);
  //       }
  //     }).bind(mockChildProcess);
  //     jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);

  //     const result = await promisifyChildProcess(mockChildProcess as unknown as ChildProcess)
  //     expect(result).toHaveProperty('stdout', '');
  //     expect(result).toHaveProperty('stderr', '');
  //     expect(result).toHaveProperty('exitCode', 0);
  //   });
  //   it('rejects if an error event is emitted', async () => {
  //     const mockError = new Error('Error!');
  //     const mockChildProcess = new MockChildProcess();
  //     const onOverride = ((event: string, callback: (...args: any) => void) => {
  //       if (event === 'error') {
  //         // @ts-ignore
  //         this.childProcessErrorCb = callback;
  //         // @ts-ignore
  //         this.childProcessErrorCb(mockError)
  //       } else if (event === 'exit') {
  //         // @ts-ignore
  //         this.childProcessExitCb = callback;
  //       }
  //     }).bind(mockChildProcess);
  //     jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);

  //     let thrownError;
  //     try {
  //       await promisifyChildProcess(mockChildProcess as unknown as ChildProcess)
  //     } catch (error) {
  //       thrownError = error;
  //     } finally {
  //       expect(thrownError).toEqual(mockError);
  //     }
  //   });
  //   it('rejects if an exit event is emitted with non-zero code', async () => {
  //     const mockChildProcess = new MockChildProcess();
  //     const onOverride = ((event: string, callback: (...args: any) => void) => {
  //       if (event === 'error') {
  //         // @ts-ignore
  //         this.childProcessErrorCb = callback;
  //       } else if (event === 'exit') {
  //         // @ts-ignore
  //         this.childProcessExitCb = callback;
  //         // @ts-ignore
  //         this.childProcessExitCb(1);
  //       }
  //     }).bind(mockChildProcess);
  //     jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);

  //     let thrownError;
  //     try {
  //       await promisifyChildProcess(mockChildProcess as unknown as ChildProcess)
  //     } catch (error) {
  //       thrownError = error;
  //     } finally {
  //       expect(thrownError).toHaveProperty('stdout', '');
  //       expect(thrownError).toHaveProperty('stderr', '');
  //       expect(thrownError).toHaveProperty('exitCode', 1);
  //     }
  //   });
  // });

  describe('runCommandSync', () => {
    beforeEach(() => {
      process.env.MOCK_VAR = 'mock-var';
      jest.spyOn(global.process.stdin, 'pipe').mockImplementation(mockPipe);
      jest.spyOn(global.process.stdin, 'pipe').mockImplementation(mockPipe);
      mockExec.mockImplementation(execStub);
    });
    // it('adds new event listeners and returns promise to resolve output', async () => {
    //   const mockChildProcess = new MockChildProcess();
    //   const onOverride = ((event: string, callback: (...args: any) => void) => {
    //     if (event === 'error') {
    //       // @ts-ignore
    //       this.childProcessErrorCb = callback;
    //     } else if (event === 'exit') {
    //       // @ts-ignore
    //       this.childProcessExitCb = callback;
    //       // @ts-ignore
    //       this.childProcessExitCb(0);
    //     }
    //   }).bind(mockChildProcess);
    //   jest.spyOn(mockChildProcess, 'on').mockImplementation(onOverride);


    //   const result = await runCommandSync('mockRunCommand');
    //   expect(result).toHaveProperty('stdout', '');
    //   expect(result).toHaveProperty('stderr', '');
    //   expect(result).toHaveProperty('exitCode', 0);
    // });
    it('combines env vars from options with env vars from process', async () => {
      const resultPromise = runCommandSync('mock command', {
        env: {
          TEST_VAR: 'test-var'
        }
      });
      const childProcess = childProcessStub;  
      childProcess.stdoutCb('data');
      childProcess.stderrCb('warning');
      childProcess.childProcessExitCb(0);
      const response = await resultPromise;

      expect(mockLoggerVerbose).toBeCalled();
      expect(mockLoggerVerbose).toBeCalledTimes(1);
      expect(mockLoggerVerbose).toBeCalledWith('mock command');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith(
        'mock command',
        expect.any(Object)
      );
      expect(mockExec.mock.calls[0][1].env).toHaveProperty('MOCK_VAR', 'mock-var');
      expect(mockExec.mock.calls[0][1].env).toHaveProperty('TEST_VAR', 'test-var');

      expect(response).toEqual({
        stdout: 'data',
        stderr: 'warning',
        exitCode: 0
      });
    });
    it('rejects on error from child process', async () => {
      const mockError = { code: 1, name: 'ExecException', message: '' };

      let thrownError;
      try {
        const resultPromise = runCommandSync('mock command');
        const childProcess = childProcessStub;
        childProcess.childProcessErrorCb(mockError);
        childProcess.childProcessExitCb(0);
        await resultPromise;
      } catch (error) {
        thrownError = error;
      } finally {
        expect(mockLoggerVerbose).toBeCalled();
        expect(mockLoggerVerbose).toBeCalledTimes(1);
        expect(mockLoggerVerbose).toBeCalledWith('mock command');

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
      const resultPromise = runCommandSync('mock command');
      const childProcess = childProcessStub;  
      childProcess.childProcessExitCb(130, 'SIGINT');
      const response = await resultPromise;

      expect(mockLoggerLog).toBeCalled();
      expect(mockLoggerLog).toBeCalledTimes(1);
      expect(mockLoggerLog).toBeCalledWith('mock command');

      expect(mockExec).toBeCalled();
      expect(mockExec).toBeCalledTimes(1);
      expect(mockExec).toBeCalledWith('mock command', undefined);

      expect(mockLoggerInfo).toBeCalled();
      expect(mockLoggerInfo).toBeCalledTimes(1);
      expect(mockLoggerInfo).toBeCalledWith('Exited due to signal: SIGINT');

      expect(response).toEqual({
        stdout: '',
        stderr: '',
        exitCode: 130
      });
    });
    it('rejects on error from main process', async () => {
      const mockError = new Error('Error!');
      mockLoggerLog.mockImplementationOnce(() => { throw mockError; } );

      let thrownError;
      try {
        await runCommandSync('mock command');
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
  
  describe('replaceFromInDockerFile', () => {
    const mockPrivateApiDockerfile = `FROM 849087520365.dkr.ecr.us-west-2.amazonaws.com/ops-api:latest-public

    ARG DEPENDENCIES
    ENV DEPENDENCIES=\${DEPENDENCIES}
    
    WORKDIR /config
    
    COPY . .
    
    WORKDIR /app
    
    RUN npm i $DEPENDENCIES
    
    CMD ["node", "./dist/server.js"]`;
    
    const mockPublicApiDockerfile = `FROM public.ecr.aws/tinystacks/ops-api:latest

    ARG DEPENDENCIES
    ENV DEPENDENCIES=\${DEPENDENCIES}
    
    WORKDIR /config
    
    COPY . .
    
    WORKDIR /app
    
    RUN npm i $DEPENDENCIES
    
    CMD ["node", "./dist/server.js"]`;
    
    const mockPrivateUiDockerfile = `FROM 849087520365.dkr.ecr.us-west-2.amazonaws.com/ops-frontend:latest-public

    ARG DEPENDENCIES
    ENV DEPENDENCIES=\${DEPENDENCIES}
    
    WORKDIR /config
    
    COPY . .
    
    WORKDIR /app
    
    RUN npm i $DEPENDENCIES
    
    CMD ["node", "./dist/server.js"]`;
    
    const mockPublicUiDockerfile = `FROM public.ecr.aws/tinystacks/ops-frontend:latest-arm

    ARG DEPENDENCIES
    ENV DEPENDENCIES=\${DEPENDENCIES}
    
    WORKDIR /config
    
    COPY . .
    
    WORKDIR /app
    
    RUN npm i $DEPENDENCIES
    
    CMD ["node", "./dist/server.js"]`;

    it('replaces private ops-api base image with public one', async () => {
      mockReadFileSync.mockReturnValue(mockPrivateApiDockerfile);

      await replaceFromInDockerFile('./mockDockerfile.api');

      expect(mockWriteFileSync).toBeCalled();
      expect(mockWriteFileSync).toBeCalledWith('./mockDockerfile.api', mockPublicApiDockerfile);
    });
    it('replaces private ops-frontend base image with public one', async () => {
      mockReadFileSync.mockReturnValue(mockPrivateUiDockerfile);

      await replaceFromInDockerFile('./mockDockerfile.ui', 'arm');

      expect(mockWriteFileSync).toBeCalled();
      expect(mockWriteFileSync).toBeCalledWith('./mockDockerfile.ui', mockPublicUiDockerfile);
    });
    it('logs and throws error if one occurs', async () => {
      const mockError = new Error('Error!')
      mockReadFileSync.mockImplementation(() => { throw mockError; });

      let thrownError;
      try {
        await replaceFromInDockerFile('./mockDockerfile.ui', 'arm');
      } catch (error) {
        thrownError = error
      } finally {
        expect(mockWriteFileSync).not.toBeCalled();
        
        expect(mockLoggerError).toBeCalled();
        expect(mockLoggerError).toBeCalledWith('File not found: ./mockDockerfile.ui');

        expect(thrownError).toEqual(mockError);
      }
    });
  });

  describe('streamToFile', () => {
    it('pipes readable contents to file', async () => {
      const readable: Readable = Readable.from([
        'This',
        'Is',
        'A',
        'Test',
        'String'
      ]);
      const mockPipe = jest.fn();
      mockPipe.mockReturnValue(readable);
      const mockOn = jest.fn();
      let errorCb = () => {};
      let closeCb = () => {};
      mockOn.mockImplementation((eventName: string, callback: () => void ) => {
        if (eventName === 'error') {
          errorCb = callback
        } else if (eventName === 'close') {
          closeCb = callback
          closeCb();
        }
        return readable;
      });
      jest.spyOn(readable, 'pipe').mockImplementation(mockPipe);
      jest.spyOn(readable, 'on').mockImplementation(mockOn);

      await streamToFile(readable, './mock-file-path');

      expect(readable.pipe).toBeCalled();
      expect(readable.pipe).toBeCalledWith(mockCreateWriteStream());

      expect(readable.on).toBeCalled();
      expect(readable.on).toBeCalledTimes(2);
      expect(readable.on).toBeCalledWith('error', expect.any(Function));
      expect(readable.on).toBeCalledWith('close', expect.any(Function));
    });
    it('rejects an error if one occurs', async () => {
      const mockError = new Error('Error!');
      const readable: Readable = Readable.from([
        'This',
        'Is',
        'A',
        'Test',
        'String'
      ]);
      const mockPipe = jest.fn();
      mockPipe.mockReturnValue(readable);
      const mockOn = jest.fn();
      let errorCb = (error: any) => {};
      let closeCb = () => {};
      mockOn.mockImplementation((eventName: string, callback: () => void ) => {
        if (eventName === 'error') {
          errorCb = callback
          errorCb(mockError);
        } else if (eventName === 'close') {
          closeCb = callback
        }
        return readable;
      });
      jest.spyOn(readable, 'pipe').mockImplementation(mockPipe);
      jest.spyOn(readable, 'on').mockImplementation(mockOn);

      let thrownError;
      try {
        await streamToFile(readable, './mock-file-path');
      } catch (error) {
        thrownError = error;
      } finally {
        expect(readable.pipe).toBeCalled();
        expect(readable.pipe).toBeCalledWith(mockCreateWriteStream());
  
        expect(readable.on).toBeCalled();
        expect(readable.on).toBeCalledTimes(2);
        expect(readable.on).toBeCalledWith('error', expect.any(Function));
        expect(readable.on).toBeCalledWith('close', expect.any(Function));

        expect(thrownError).toEqual(mockError);
      }
    });
  });
});