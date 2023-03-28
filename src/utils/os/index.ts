import { ChildProcess, exec, ExecOptions } from 'child_process';
import { Readable } from 'stream';
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

export async function streamToString (stream: Readable) {
  // lets have a ReadableStream as a stream variable
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export async function promisifyChildProcess (childProcess: ChildProcess) {
  return new Promise((resolve, reject) => {
    const standardOut: string[] = [];
    const standardError: string[] = [];

    childProcess.stdout?.on('data', (data) => {
      standardOut.push(data);
    });
    
    childProcess.stderr?.on('data', (data) => {
      standardError.push(data);
    });

    childProcess.on('error', (error: Error) => {
      reject(error);
    });
    
    childProcess.on('exit', (code: number, signal: string) => {
      if (code === 0) {
        resolve({
          stdout: standardOut.join('\n'),
          stderr: standardError.join('\n'),
          exitCode: code
        });
      } else {
        reject({
          stdout: standardOut.join('\n'),
          stderr: standardError.join('\n'),
          exitCode: code,
          signal
        });
      }
    });
  });
}