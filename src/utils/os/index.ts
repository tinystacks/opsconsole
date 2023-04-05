import { ChildProcess, exec, ExecOptions } from 'child_process';
import fs from 'fs';
import { Readable } from 'stream';
import logger from '../../logger';
import { OsOutput } from '../../types';
import { API_IMAGE_ECR_URL, UI_IMAGE_ECR_URL } from '../../constants';

type CommandOptions = { verbose: boolean } & ExecOptions;

export async function runCommandSync (command: string, opts?: CommandOptions): Promise<OsOutput> {
  return new Promise((resolve, reject) => {
    // we "return await" here so that errors can be handled within this function to execute retry logic
    if (opts) {
      opts.env = { ...process.env, ...(opts.env || {}) };
    }
    const standardOut: string[] = [];
    const standardError: string[] = [];
    let exitCode: number;
    
    if (opts.verbose) {
      console.log(command);
    }
    const childProcess = exec(command, opts);

    if (opts.verbose) {
      childProcess.stdout.on('data', (data) => {
        console.log(data);
        standardOut.push(data);
      });     
      childProcess.stderr.on('data', (data) => {
        console.error(data);
        standardError.push(data);
      });
    }

    process.stdin.pipe(childProcess.stdin);

    childProcess.on('error', (error: Error) => {
      logger.error(`Failed to execute command "${command}"`);
      reject(error);
    });
    
    childProcess.on('exit', (code: number, signal: string) => {
      if (code !== 0) {
        logger.error(`Failed to execute command "${command}"`);
        reject(new Error());
      }
      if (signal) logger.error(`Exited due to signal: ${signal}`);
      exitCode = code;
      resolve({
        stdout: standardOut.join('\n'),
        stderr: standardError.join('\n'),
        exitCode
      });
    });
  });
}

export function runCommand (command: string, opts?: CommandOptions): ChildProcess {
  if (opts) {
    opts.env = { ...process.env, ...(opts.env || {}) };
  }

  logger.verbose(command);
  const childProcess = exec(command, opts);

  childProcess.stdout.on('data', (data) => {
    logger.verbose(data);
  });

  childProcess.stderr.on('data', (data) => {
    logger.verbose(data);
  });

  process.stdin.pipe(childProcess.stdin);

  childProcess.on('error', (e: Error) => {
    // logger.error(`Failed to execute command "${command}"`);
    logger.verbose(`Failed to execute command:\n${command}\nError: ${e.message}`);
  });

  childProcess.on('exit', (code: number, signal: string) => {
    // if (code !== 0) logger.verbose(`The folowing command(s) exited with code: ${code}\n${command}\n`);
    if (signal) logger.info(`Exited due to signal: ${signal}`);
  });

  return childProcess;
}

export async function streamToFile (Body: any, filePath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    if (Body instanceof Readable) {
      Body.pipe(fs.createWriteStream(filePath))
        .on('error', err => reject(err))
        .on('close', () => resolve());
    }
  });
}

export async function streamToString (stream: Readable): Promise<string> {
  // lets have a ReadableStream as a stream variable
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export async function promisifyChildProcess (childProcess: ChildProcess): Promise<OsOutput> {
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

export function replaceFromInDockerFile (filePath: string, tag?: string): void {
  try {
    const component = filePath.split('.').at(-1);
    const file = fs.readFileSync(filePath, 'utf-8');
    const regEx = new RegExp('^FROM.*');
    let replacedFile: string;
    if (component === 'api') {
      replacedFile = file.replace(regEx, `FROM ${API_IMAGE_ECR_URL(tag)}`);
    } else if (component === 'ui') {
      replacedFile = file.replace(regEx, `FROM ${UI_IMAGE_ECR_URL(tag)}`);
    }
    fs.writeFileSync(filePath, replacedFile);
  } catch (e) {
    logger.error(`File not found: ${filePath}`);
    throw e;
  }
}