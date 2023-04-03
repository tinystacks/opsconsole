import { exec, ExecOptions } from 'child_process';
import fs from 'fs';
import { Readable } from 'stream';
import logger from '../../logger';
import { API_IMAGE_ECR_URL, OsOutput, UI_IMAGE_ECR_URL } from '../../types';

export async function runCommandSync (command: string, opts?: ExecOptions): Promise<OsOutput> {
  return new Promise((resolve, reject) => {
    try {
      // we "return await" here so that errors can be handled within this function to execute retry logic
      if (opts) {
        opts.env = { ...process.env, ...(opts.env || {}) };
      }
      const standardOut: string[] = [];
      const standardError: string[] = [];
      let exitCode: number;
      
      logger.log(command);
      const childProcess = exec(command, opts);

      childProcess.stdout.on('data', (data) => {
        console.log(data);
        standardOut.push(data);
      });
      
      childProcess.stderr.on('data', (data) => {
        console.error(data);
        standardError.push(data);
      });

      process.stdin.pipe(childProcess.stdin);

      childProcess.on('error', (error: Error) => {
        logger.error(`Failed to execute command "${command}"`);
        reject(error);
      });
      
      childProcess.on('exit', (code: number, signal: string) => {
        if (signal) logger.info(`Exited due to signal: ${signal}`);
        exitCode = code;
        resolve({
          stdout: standardOut.join('\n'),
          stderr: standardError.join('\n'),
          exitCode
        });
      });
    } catch (error) {
      logger.error(`Failed to execute command "${command}"`);
      reject(error);
    }
  });
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

export async function streamToFile (Body: any, filePath: string) {
  await new Promise<void>((resolve, reject) => {
    if (Body instanceof Readable) {
      Body.pipe(fs.createWriteStream(filePath))
        .on('error', err => reject(err))
        .on('close', () => resolve());
    }
  });
}

export async function streamToString (stream: Readable) {
  // lets have a ReadableStream as a stream variable
  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

export function replaceFromInDockerFile (filePath: string, tag: string) {
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