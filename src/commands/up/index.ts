import * as fs from 'fs';
import * as path from 'path';
import { S3 } from '@aws-sdk/client-s3';
import { ChildProcess } from 'child_process';
import isNil from 'lodash.isnil';
import logger from '../../logger';
import { isPortAvailable, logAndThrow, replaceFromInDockerFile, runCommand, runCommandSync, streamToFile } from '../../utils/os';
import { ImageArchitecture, UpOptions } from '../../types';
import { DEFAULT_CONFIG_FILENAME, Platform, SEP } from '../../constants';
import { parseConfig, validateDependencies } from '../../utils/config';
import { getOpen } from '../../utils/open';

const BACKEND_SUCCESS_INDICATOR = 'Running on http://localhost:8000';
const FRONTEND_SUCCESS_INDICATOR = 'ready - started server on 0.0.0.0:3000';

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

async function validatePorts (backendPort: number, frontendPort: number) {
  const portsInUse: number[] = [];
  for (const port of [ backendPort, frontendPort ]) {
    if (!(await isPortAvailable(port))) {
      portsInUse.push(port);
    }
  }
  if (portsInUse.length) {
    logAndThrow(`The following port(s) are not available: ${portsInUse.join(', ')}`);
  }
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
    // must be double quotes for Windows compatability
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
  await streamToFile(apiRes.Body, Platform.ApiFilePath);
  replaceFromInDockerFile(Platform.ApiFilePath, tag);
  const uiRes = await s3Client.getObject({
    Bucket: 'ops-stacks-config-storage-bucket-us-west-2',
    Key: 'Dockerfile.ui'
  });
  await streamToFile(uiRes.Body, Platform.UiFilePath);
  replaceFromInDockerFile(Platform.UiFilePath, tag);
}

async function startNetwork () {
  try {
    const commands = [
      `docker network rm ops-console || ${Platform.ExitSuccess}`,
      'docker network create -d bridge ops-console'
    ].join(SEP);
    await runCommandSync(commands);
  } catch (e) {
    logAndThrow('Failed to launch ops console docker network!', e);
  }
}

function runBackend (dependencies: string, file: string, dir: string, backendPort: number) {
  const backendUrl = `0.0.0.0:${backendPort}`;
  logger.info(`Launching backend on ${backendUrl}...`);
  const commands = [
    `docker build --pull --build-arg RUNTIME_DEPENDENCIES=${dependencies} -f ${Platform.ApiFilePath} -t ops-api .`,
    `docker container stop ops-api || ${Platform.ExitSuccess}`,
    `docker container rm ops-api || ${Platform.ExitSuccess}`,
    `docker run --name ops-api -v ${Platform.AwsConfigPath}:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p ${backendPort}:8000 --network=ops-console ops-api`
  ].join(SEP);
  const childProcess = runCommand(commands);
  childProcess.stdout.on('data', (data) => {
    if (data.includes(BACKEND_SUCCESS_INDICATOR)) { 
      logger.success(`Ops console backend is now running on http://${backendUrl}`);
    }
  });
  return childProcess;
}

function runFrontend (dependencies: string, open: any, frontendPort: number) {
  const frontendUrl = `0.0.0.0:${frontendPort}`;
  logger.info(`Launching frontend on ${frontendUrl}...`);
  const commands = [
    `docker build --pull --build-arg RUNTIME_DEPENDENCIES=${dependencies} -f ${Platform.UiFilePath} -t ops-frontend .`,
    `docker container stop ops-frontend || ${Platform.ExitSuccess}`,
    `docker container rm ops-frontend || ${Platform.ExitSuccess}`,
    `docker run --name ops-frontend --env AWS_REGION=us-west-2 --env API_ENDPOINT=http://ops-api:8000 -i -p ${frontendPort}:3000 --network=ops-console ops-frontend`
  ].join(SEP);
  const childProcess = runCommand(commands);
  childProcess.stdout.on('data', (data) => {
    if (data.includes(FRONTEND_SUCCESS_INDICATOR )) {
      logger.success(`Ops console frontend is now running on http://${frontendUrl}`);
      open.default(`http://${frontendUrl}`);
    }
  });
  return childProcess;
}

function cleanup () {
  logger.info('Cleaning up...');
  fs.unlink(Platform.ApiFilePath, () => { return; });
  fs.unlink(Platform.UiFilePath, () => { return; });
}

const signals = [ 'SIGINT', 'SIGQUIT', 'SIGTERM' ];
function setParentCleanupHandler () {
  signals.forEach((signal) => {
    process.on(signal, cleanup);
  });
}

function setProcessCleanupHandler (backendProcess: ChildProcess, frontendProcess: ChildProcess) {
  function cleanupProcesses () {
    runCommand(`docker stop ops-frontend ops-api || ${Platform.ExitSuccess} && docker network rm ops-console || ${Platform.ExitSuccess}`);
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
    backendPort = 8000,
    frontendPort = 3000
  } = options;
  try {
    setParentCleanupHandler();
    const { file, parentDirectory } = validateConfigFilePath(configFile);
    const tag = validateArchitecture(arch);
    await validatePorts(backendPort, frontendPort);
    const dependencies = await getDependencies(file, parentDirectory);
    await pullDockerFiles(tag);
    await startNetwork();
    const open = await getOpen();
    const backendProcess = runBackend(dependencies, file, parentDirectory, backendPort);
    const frontendProcess = runFrontend(dependencies, open, frontendPort);
    setProcessCleanupHandler(backendProcess, frontendProcess);
    logger.info('This may take a moment.');
  } catch (e) {
    const verboseHint = process.env.VERBOSE === 'true' ? '' : ' To debug further, please run with the -V, --verbose flag';
    logger.error(`opsconsole up failed!${verboseHint}`, e);
  }
}

export {
  up
};