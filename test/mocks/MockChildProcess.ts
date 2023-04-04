export class MockChildProcess {
  stdoutCb: (data: string) => void;
  stderrCb: (data: string) => void;
  childProcessErrorCb: (error: Error) => void;
  childProcessExitCb: (code: number, signal?: string) => void;
  kill: jest.Mock;
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
    this.kill = jest.fn();
  }
  on (event: string, callback: (...args: any) => void) {
    if (event === 'error') {
      this.childProcessErrorCb = callback;
    } else if (event === 'exit') {
      this.childProcessExitCb = callback;
    }
  }
}