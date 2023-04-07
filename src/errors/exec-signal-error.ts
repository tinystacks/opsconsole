class ExecSignalError extends Error {
  name: 'ExecError';
  signal: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  constructor(signal: string, stdout?: string, stderr?: string, exitCode?: number) {
    super();
    this.signal = signal;
    this.stdout = stdout;
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

export {
  ExecSignalError
};