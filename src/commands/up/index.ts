import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { YamlConsole } from '@tinystacks/ops-model';
import { S3 } from '@aws-sdk/client-s3';
import { ChildProcess } from 'child_process';
import logger from '../../logger';
import isNil from 'lodash.isnil';
import { promisifyChildProcess, replaceFromInDockerFile, runCommand, streamToFile } from '../../utils/os';
import { ImageArchitecture, UpOptions } from '../../types';
import { DEFAULT_CONFIG_FILENAME } from '../../constants';
import { getConsoleParser } from '../../utils/ops-core';

// User experience/README notes
// note format for dependencies in yaml
// need a way to fail early if packages don't exist
// Note how long it may take for images to build
// Flag not to rebuild image
// note docker must be running

const BACKEND_SUCCESS_INDICATOR = 'Running on http://localhost:8000';
const FRONTEND_SUCCESS_INDICATOR = 'ready - started server on 0.0.0.0:3000';
const API_FILEPATH = '/tmp/Dockerfile.api';
const UI_FILEPATH = '/tmp/Dockerfile.ui';

async function startNetwork () {
  try {
    const commands = [
      'docker network rm ops-console',
      'docker network create -d bridge ops-console'
    ].join('\n');
    await promisifyChildProcess(runCommand(commands));
    // .catch((e) => {
    //   const isChildProcessOutput: boolean = !Number.isNaN(e.exitCode) && !isNil(e.stdout) && !isNil(e.stderr);
    //   if (isChildProcessOutput) {
    //     if (e.signal) {
    //       throw new Error(`Process was interrupted by signal ${e.signal}! Exiting with code ${e.exitCode}...`);
    //     }
    //     throw new Error(`Commands to start docker network failed with exit code ${e.exitCode}!\n\t stdout: ${e.stdout}\n\t stderr: ${e.stderr}`);
    //   }
    //   throw e;
    // });
  } catch (e) {
    logger.error('Failed to launch ops console docker network!');
    throw e;
  }
}
async function getDependencies (dir: string, file: string) {
  try {
    const configFile = fs.readFileSync(`${dir}/${file}`);
    const configJson = (yaml.load(configFile.toString()) as any)?.Console as YamlConsole;
    const ConsoleParser = await getConsoleParser();
    const parsedYaml = ConsoleParser.parse(configJson);
    const dependencies = new Set(Object.values(parsedYaml.dependencies));
    const dependenciesString = Array.from(dependencies).join(' ');
    return `"${dependenciesString}"`;
  } catch (e) {
    logger.error('Failed to install dependencies. Please verify that your yaml template is formatted correctly.');
    throw e;
  }
}

async function pullDockerFiles (tag: string) {
  const s3Client = new S3({
    signer: { sign: async (request: any) => request },
    region: 'us-west-2'
  });
  const apiRes = await s3Client.getObject({
    Bucket: 'ops-stacks-config-storage-bucket-us-west-2',
    Key: 'Dockerfile.api'
  });
  await streamToFile(apiRes.Body, API_FILEPATH);
  replaceFromInDockerFile(API_FILEPATH, tag);
  const uiRes = await s3Client.getObject({
    Bucket: 'ops-stacks-config-storage-bucket-us-west-2',
    Key: 'Dockerfile.ui'
  });
  await streamToFile(uiRes.Body, UI_FILEPATH);
  replaceFromInDockerFile(UI_FILEPATH, tag);
}

function runBackend (dependencies: string, dir: string, file: string) {
  try {
    logger.info('Launching backend on 0.0.0.0:8000. This may take a moment.');
    const commands = [
      `docker build --pull --build-arg DEPENDENCIES=${dependencies} -f ${API_FILEPATH} -t ops-api . || exit 1`,
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      `docker run --name ops-api -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p 8000:8000 --network=ops-console ops-api;`
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(BACKEND_SUCCESS_INDICATOR)) { 
        logger.success('Ops console backend now running on http://0.0.0.0:8000');
      }
    });
    return childProcess;
  } catch (e) {
    logger.error(`Error launching ops console backend: ${e}`);
    throw e;
  }
}

function runFrontend (dependencies: string, open: any) {
  try {
    logger.info('Launching frontend on 0.0.0.0:3000. This may take a moment.');
    const commands = [
      `docker build --pull --build-arg DEPENDENCIES=${dependencies} -f ${UI_FILEPATH} -t ops-frontend . || exit 1`,
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      'docker run --name ops-frontend --env AWS_REGION=us-west-2 --env API_ENDPOINT=http://ops-api:8000 -i -p 3000:3000 --network=ops-console ops-frontend;'
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(FRONTEND_SUCCESS_INDICATOR )) {
        logger.success('Ops console frontend now running on http://0.0.0.0:3000');
        open.default('http://0.0.0.0:3000');
      }
    });
    return childProcess;
  } catch (e) {
    logger.error(`Error launching ops console frontend: ${e}`);
    throw e;
  }
}

function validateArchitecture (arch: string) {
  switch (arch) {
    case 'x86':
      return ImageArchitecture.x86;
    case 'x64':
      return ImageArchitecture.x86;
    case 'ia32':
      return ImageArchitecture.x86;
    case 'arm':
      return ImageArchitecture.ARM;
    case 'arm64':
      return ImageArchitecture.ARM;
    default:
      throw new Error(`ops does not currently support ${arch}`);
  }
}

function validateConfigFilePath (configFile: string) {
  const absolutePath = path.resolve(configFile || `${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);
  if (fs.existsSync(absolutePath)) {
    return {
      dir: path.dirname(absolutePath),
      file: path.basename(absolutePath)
    };
  }
  throw new Error(`Specified config file ${absolutePath} does not exist.`);
}

// attaches cleanup hooks to frontend and backend in case of signal, error, or exit code
function handleCleanup (backendProcess: ChildProcess, frontendProcess: ChildProcess) {
  const signals = [ 'SIGINT', 'SIGQUIT', 'SIGTERM' ];
  function cleanup () {
    logger.info('Cleaning up...');
    fs.unlink(API_FILEPATH, () => { return; });
    fs.unlink(UI_FILEPATH, () => { return; });
    runCommand('docker stop ops-frontend ops-api || true; docker network rm ops-console || true');
    backendProcess.kill();
    frontendProcess.kill();
  }

  signals.forEach((signal) => {
    process.on(signal, cleanup);
  });

  backendProcess.on('error', () => {
    logger.error('Failed to launch ops console backend!');
    cleanup();
  });
  frontendProcess.on('error', () => {
    logger.error('Failed to launch ops console frontend!');
    cleanup();
  });
  backendProcess.on('exit', (code, signal) => {
    // only checks for an exit that is not a result of a handled signal
    if (!signals.includes(signal) && !isNil(code) && code !== 0) {
      logger.error(`Backend exited with code ${code}`);
      cleanup();
    }
  });
  // frontendProcess.on('exit', (code, signal) => {
  //   if (!signals.includes(signal) && !isNil(code) && code !== 0) {
  //     logger.error(`Frontend exited with code ${code}`);
  //     cleanup();
  //   }
  // });
}

async function up (options: UpOptions) {
  const { 
    arch = process.arch, 
    configFile,
    verbose = false
  } = options;
  try {
    process.env.VERBOSE = verbose.toString();
    const { dir, file } = validateConfigFilePath(configFile);
    const tag = validateArchitecture(arch);
    const dependencies = await getDependencies(dir, file);
    await pullDockerFiles(tag);
    await startNetwork();
    const open = await import('open');
    const backendProcess = runBackend(dependencies, dir, file);
    const frontendProcess = runFrontend(dependencies, open);
    handleCleanup(backendProcess, frontendProcess);
  } catch (e) {
    logger.error('ops-cli up failed. To debug, please run with the -V, --verbose flag');
  }
}

export {
  up
};