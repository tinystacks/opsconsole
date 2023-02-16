import { exec, ExecOptions } from 'child_process';
import logger from '../../logger';

export function runCommand (command: string, opts?: ExecOptions) {
  try {
    // we "return await" here so that errors can be handled within this function to execute retry logic
    if (opts) {
      opts.env = { ...process.env, ...(opts.env || {}) };
    }

    logger.log(command);
    const childProcess = exec(command, opts);

    childProcess.stdout.on('data', (data) => {
      console.log(data);
    });

    childProcess.stderr.on('data', (data) => {
      console.error(data);
    });

    process.stdin.pipe(childProcess.stdin);

    childProcess.on('error', (error: Error) => {
      logger.error(`Failed to execute command "${command}"`);
      throw error;
    });

    childProcess.on('exit', (code: number, signal: string) => {
      if (signal) logger.info(`Exited due to signal: ${signal}`);
    });

    return childProcess;
  } catch (error) {
    logger.error(`Failed to execute command "${command}"`);
    throw error;
  }
}