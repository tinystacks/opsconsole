import * as fs from 'fs';
import * as path from 'path';
import { S3 } from '@aws-sdk/client-s3';
import { ChildProcess } from 'child_process';
import logger from '../../logger';
import isNil from 'lodash.isnil';
import { logAndThrow, replaceFromInDockerFile, runCommand, runCommandSync, streamToFile } from '../../utils/os';
import { ImageArchitecture, UpOptions } from '../../types';
import { DEFAULT_CONFIG_FILENAME } from '../../constants';
import { parseConfig, validateDependencies } from '../../utils/config';
import { getOpen } from '../../utils/open/index';

// User experience/README notes
// note format for dependencies in yaml
// x need a way to fail early if packages don't exist
// Note how long it may take for images to build
// Flag not to rebuild image
// note docker must be running
// verify commands to see if they are windows compatible
// add copy flag to mount directory with local packages
// port flag
// flag to choose whether to build or not
// x .at only works on new version
// Troubleshooting/Getting started
// have docker desktop running on windows in README for priveleged

const BACKEND_SUCCESS_INDICATOR = 'Running on http://localhost:8000';
const FRONTEND_SUCCESS_INDICATOR = 'ready - started server on 0.0.0.0:3000';
const API_FILEPATH = './Dockerfile.api';
const UI_FILEPATH = './Dockerfile.ui';
const EXIT_0 = process.platform === 'win32' ? 'exit 0' : 'true';

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
      logAndThrow(`ops does not currently support ${arch}`);
  }
}

function validateConfigFilePath (configFile: string) {
  const absolutePath = path.resolve(configFile || `${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);
  if (fs.existsSync(absolutePath)) {
    return {
      parentDirectory: path.dirname(absolutePath),
      file: path.basename(absolutePath)
    };
  }
  logAndThrow(`Specified config file ${absolutePath} does not exist.`);
}

async function getDependencies (file: string, parentDirectory: string) {
  try {
    logger.info('Validating dependencies...');
    const parsedConfig = await parseConfig(file, parentDirectory);
    const dependencies = new Set(Object.values(parsedConfig.dependencies));
    const dependenciesArray = Array.from(dependencies);
    await validateDependencies(dependenciesArray);
    logger.success('Dependencies validated!');
    const dependenciesString = dependenciesArray.join(' ');
    return `"${dependenciesString}"`;
  } catch (e) {
    logAndThrow('Failed to install dependencies. Please verify that your yaml template is formatted correctly.', e);
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

async function startNetwork () {
  try {
    const commands = [
      `docker network rm ops-console || ${EXIT_0};`,
      'docker network create -d bridge ops-console;'
    ].join('\n');
    await runCommandSync(commands);
  } catch (e) {
    logAndThrow('Failed to launch ops console docker network!', e);
  }
}

function runBackend (dependencies: string, file: string, dir: string) {
  logger.info('Launching backend on 0.0.0.0:8000...');
  const commands = [
    `docker build --pull --build-arg RUNTIME_DEPENDENCIES=${dependencies} -f ${API_FILEPATH} -t ops-api .`,
    `docker container stop ops-api || ${EXIT_0}`,
    `docker container rm ops-api || ${EXIT_0}`,
    `docker run --name ops-api -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p 8000:8000 --network=ops-console ops-api;`
  ].join(';\n');
  const childProcess = runCommand(commands);
  childProcess.stdout.on('data', (data) => {
    if (data.includes(BACKEND_SUCCESS_INDICATOR)) { 
      logger.success('Ops console backend is now running on http://0.0.0.0:8000');
    }
  });
  return childProcess;
}

function runFrontend (dependencies: string, open: any) {
  logger.info('Launching frontend on 0.0.0.0:3000...');
  const commands = [
    `docker build --pull --build-arg RUNTIME_DEPENDENCIES=${dependencies} -f ${UI_FILEPATH} -t ops-frontend .`,
    `docker container stop ops-frontend || ${EXIT_0}`,
    `docker container rm ops-frontend || ${EXIT_0}`,
    'docker run --name ops-frontend --env AWS_REGION=us-west-2 --env API_ENDPOINT=http://ops-api:8000 -i -p 3000:3000 --network=ops-console ops-frontend;'
  ].join(';\n');
  const childProcess = runCommand(commands);
  childProcess.stdout.on('data', (data) => {
    if (data.includes(FRONTEND_SUCCESS_INDICATOR )) {
      logger.success('Ops console frontend is now running on http://0.0.0.0:3000');
      open.default('http://0.0.0.0:3000');
    }
  });
  return childProcess;
}

function cleanup () {
  logger.info('Cleaning up...');
  fs.unlink(API_FILEPATH, () => { return; });
  fs.unlink(UI_FILEPATH, () => { return; });
}

const signals = [ 'SIGINT', 'SIGQUIT', 'SIGTERM' ];
function setParentCleanupHandler () {
  signals.forEach((signal) => {
    process.on(signal, cleanup);
  });
}

function setProcessCleanupHandler (backendProcess: ChildProcess, frontendProcess: ChildProcess) {
  function cleanupProcesses () {
    runCommand(`docker stop ops-frontend ops-api || ${EXIT_0}; docker network rm ops-console || ${EXIT_0}`);
    backendProcess?.kill();
    frontendProcess?.kill();
  }

  signals.forEach((signal) => {
    process.on(signal, cleanupProcesses);
  });
  backendProcess?.on('error', () => {
    logger.error('Failed to launch ops console backend!');
    cleanup();
    cleanupProcesses();
  });
  frontendProcess?.on('error', () => {
    logger.error('Failed to launch ops console frontend!');
    cleanup();
    cleanupProcesses();
  });
  backendProcess?.on('exit', (code) => {
    if (!isNil(code) && code !== 0) {
      logger.error(`Backend exited with code ${code}`);
      cleanup();
      cleanupProcesses();
    }
  });
  /*
  frontendProcess?.on('exit', (code, signal) => {
    if (!signals.includes(signal) && !isNil(code) && code !== 0) {
      logger.error(`Frontend exited with code ${code}`);
      cleanup();
      cleanupProcesses();
    }
  });
  */
}

async function up (options: UpOptions) {
  const { 
    arch = process.arch, 
    configFile,
    verbose = false
  } = options;
  try {
    setParentCleanupHandler();
    process.env.VERBOSE = verbose.toString();
    const { file, parentDirectory } = validateConfigFilePath(configFile);
    const tag = validateArchitecture(arch);
    const dependencies = await getDependencies(file, parentDirectory);
    await pullDockerFiles(tag);
    await startNetwork();
    const open = await getOpen();
    const backendProcess = runBackend(dependencies, file, parentDirectory);
    const frontendProcess = runFrontend(dependencies, open);
    setProcessCleanupHandler(backendProcess, frontendProcess);
    logger.info('This may take a moment.');
  } catch (e) {
    const verboseHint = process.env.VERBOSE === 'true' ? '' : ' To debug, please run with the -V, --verbose flag';
    logger.error(`ops-cli up failed!${verboseHint}`, e);
  }
}

export {
  up
};