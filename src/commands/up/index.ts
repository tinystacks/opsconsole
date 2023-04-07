import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { YamlConsole } from '@tinystacks/ops-model';
import logger from '../../logger';
import isNil from 'lodash.isnil';
import { promisifyChildProcess, replaceFromInDockerFile, runCommand, streamToFile } from '../../utils/os';
import { ImageArchitecture, UpOptions } from '../../types';
import { DEFAULT_CONFIG_FILENAME } from '../../constants';
import { ChildProcess } from 'child_process';
import { S3 } from '@aws-sdk/client-s3';
import { getConsoleParser } from '../../utils/ops-core';

const BACKEND_SUCCESS_INDICATOR = 'Running on http://localhost:8000';
const FRONTEND_SUCCESS_INDICATOR = 'ready - started server on 0.0.0.0:3000';
const API_FILEPATH = './Dockerfile.api';
const UI_FILEPATH = './Dockerfile.ui';

async function startNetwork () {
  try {
    const commands = [
      'docker network rm ops-console || true;',
      'docker network create -d bridge ops-console;'
    ].join('\n');
    await promisifyChildProcess(runCommand(commands)).catch((e) => {
      const isChildProcessOutput: boolean = !Number.isNaN(e.exitCode) && !isNil(e.stdout) && !isNil(e.stderr);
      if (isChildProcessOutput) {
        if (e.signal) {
          throw new Error(`Process was interrupted by signal ${e.signal}! Exiting with code ${e.exitCode}...`);
        }
        throw new Error(`Commands to start docker network failed with exit code ${e.exitCode}!\n\t stdout: ${e.stdout}\n\t stderr: ${e.stderr}`);
      }
      throw e;
    });
  } catch (error) {
    logger.error('Error launching ops console network!');
    throw error;
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
    logger.info('Launching backend on localhost:8000');
    const commands = [
      `docker build --pull --build-arg RUNTIME_DEPENDENCIES=${dependencies} -f ${API_FILEPATH} -t ops-api . || exit 1`,
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      `docker run --name ops-api -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p 8000:8000 --network=ops-console ops-api;`
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(BACKEND_SUCCESS_INDICATOR)) { 
        logger.success('Ops console backend successfully launched');
      }
    });
    return childProcess;
  } catch (e) {
    logger.error(`Error launching ops console backend: ${e}`);
    throw e;
  }
}

function runFrontend (dependencies: string) {
  try {
    logger.info('Launching frontend on localhost:3000');
    const commands = [
      `docker build --pull --build-arg RUNTIME_DEPENDENCIES=${dependencies} -f ${UI_FILEPATH} -t ops-frontend . || exit 1`,
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      'docker run --name ops-frontend --env AWS_REGION=us-west-2 --env API_ENDPOINT=http://ops-api:8000 -i -p 3000:3000 --network=ops-console ops-frontend;'
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(FRONTEND_SUCCESS_INDICATOR )) {
        logger.success('Ops console frontend successfully launched');
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

function handleExitSignalCleanup (backendProcess?: ChildProcess, frontendProcess?: ChildProcess) {
  function cleanup () {
    logger.info('Cleaning up...');
    fs.unlink(API_FILEPATH, () => { return; });
    fs.unlink(UI_FILEPATH, () => { return; });
    backendProcess?.kill();
    frontendProcess?.kill();
    runCommand('docker stop ops-frontend ops-api || true; docker network rm ops-console || true');
  }
  process.on('SIGINT', cleanup);
  process.on('SIGQUIT', cleanup);
  process.on('SIGTERM', cleanup); 
}

async function up (options: UpOptions) {
  const { 
    arch = process.arch, 
    configFile
  } = options;
  try {
    const { dir, file } = validateConfigFilePath(configFile);
    const tag = validateArchitecture(arch);
    const dependencies = await getDependencies(dir, file);
    await pullDockerFiles(tag);
    await startNetwork();
    const backendProcess = runBackend(dependencies, dir, file);
    const frontendProcess = runFrontend(dependencies);
    handleExitSignalCleanup(backendProcess, frontendProcess);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred';
    logger.error(message);
  }
}

export {
  up
};