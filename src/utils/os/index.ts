import { ChildProcess, exec, ExecOptions } from 'child_process';
import fs from 'fs';
import { Readable } from 'stream';
import net from 'net';
import logger from '../../logger';
import { OsOutput } from '../../types';
import { API_IMAGE_ECR_URL, UI_IMAGE_ECR_URL } from '../../constants';
import isNil from 'lodash.isnil';
import { ExecSignalError } from '../../errors/exec-signal-error';

export function runCommand (command: string, opts?: ExecOptions): ChildProcess {
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
    logger.verbose(`Failed to execute command:\n${command}\nError: ${e.message}`);
  });

  childProcess.on('exit', (code: number, signal: string) => {
    if (!isNil(code) && code !== 0) logger.verbose(`The following command(s) exited with code: ${code}\n${command}`);
    if (signal) logger.verbose(`Exited due to signal: ${signal}`);
  });

  return childProcess;
}

export async function runCommandSync (command: string, opts?: ExecOptions): Promise<OsOutput> {
  const childProcess = runCommand(command, opts);
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
      if (signal) {
        reject(new ExecSignalError(
          signal,
          standardOut.join('\n'),
          standardError.join('\n'),
          code
        ));
      }
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
          exitCode: code
        });
      }
    });
  });
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

export function editDockerFile (filePath: string, tag?: string): void {
  try {
    const filePathParts = filePath.split('.');
    const component = filePathParts[filePathParts.length - 1];
    const file = fs.readFileSync(filePath, 'utf-8');
    const fromRegEx = new RegExp('^FROM.*');
    let replacedFile: string;
    if (component === 'api') {
      replacedFile = file.replace(fromRegEx, `FROM ${API_IMAGE_ECR_URL(tag)}`);
    } else if (component === 'ui') {
      replacedFile = file.replace(fromRegEx, `FROM ${UI_IMAGE_ECR_URL(tag)}`);
    }
    replacedFile = replacedFile.replace(/COPY.*/, '');
    fs.writeFileSync(filePath, replacedFile);
  } catch (e) {
    logger.error(`File not found: ${filePath}`);
    throw e;
  }
}

export function logAndThrow (message: string, e?: any): never {
  if (e instanceof ExecSignalError) {
    throw e;
  }
  logger.error(message, e);
  throw new Error(message);
}

export async function sleep (milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function isPortAvailable (port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', (e: any) => {
      s.close();
      if (e.code == 'EADDRINUSE') {
        resolve(false);
      } else {
        logAndThrow(e.message, e);
      }
    });
    s.once('listening', () => {
      resolve(true);
      s.close();
    });
    s.listen(port);
  });
}

export function validateCwdPermissions () {
  try {
    fs.accessSync(process.cwd(), fs.constants.R_OK | fs.constants.W_OK);
  } catch (e) {
    logAndThrow('Ops Console requires read and write permissions for the current working directory', e);
  }

}