import { exec, execSync, ExecOptions } from 'child_process';
import { Readable } from 'stream';
import logger from '../../logger/index.js';

export function runCommandSync (command: string, opts?: ExecOptions) {
  try {
    const out = execSync(command, { ...opts, encoding: 'utf-8' });
    console.log(out);
  } catch (e) {
    logger.error(`Failed to execute command "${command}"`);
    throw e;
  }
}

export function runCommand (command: string, opts?: ExecOptions) {
  try {
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

export async function sleep (ms: number) {
  return await new Promise(r => setTimeout(r, ms));
}