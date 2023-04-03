import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { YamlConsole } from '@tinystacks/ops-model';
import logger from '../../logger';
import { replaceFromInDockerFile, runCommand, runCommandSync, streamToFile } from '../../utils/os';
import { API_IMAGE_ECR_URL, DEFAULT_CONFIG_FILENAME, ImageArchitecture, UI_IMAGE_ECR_URL, UpOptions } from '../../types';
import { ChildProcess } from 'child_process';
import { S3 } from '@aws-sdk/client-s3';

const BACKEND_SUCCESS_INDICATOR = 'Running on http://localhost:8000';
const FRONTEND_SUCCESS_INDICATOR = 'ready - started server on 0.0.0.0:3000';
const API_FILEPATH = 'Dockerfile.api';
const UI_FILEPATH = 'Dockerfile.ui';

async function getDependencies (dir: string, file: string) {
  try {
    const configFile = fs.readFileSync(`${dir}/${file}`);
    const configJson = (yaml.load(configFile.toString()) as any)?.Console as YamlConsole;
    const { ConsoleParser } = await import('@tinystacks/ops-core');
    const parsedYaml = ConsoleParser.parse(configJson);
    const dependencies = new Set(Object.values(parsedYaml.dependencies));
    const dependenciesString = Array.from(dependencies).join(' ');
    return `"${dependenciesString}"`;
  } catch (e) {
    logger.error('Failed to install dependencies. Please verify that your yaml template is formatted correctly.');
    throw e;
  }
}

async function startNetwork () {
  try {
    logger.info('Launching ops-console docker network');
    const commands = [
      'docker network rm ops-console',
      'docker network create -d bridge ops-console'
    ].join('\n');
    await runCommandSync(commands);
  } catch (e) {
    logger.error('Error launching ops console network');
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

function runBackend (tag: string, dependencies: string, dir: string, file: string) {
  try {
    logger.info('Launching backend on localhost:8000');
    const commands = [
      // `docker pull public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}`,
      `docker build --build-arg DEPENDENCIES=${dependencies} -f Dockerfile.api -t api:latest . || exit 1`,
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      // `docker run --name ops-api -v /tmp/${consoleName}:/dependencies -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p 8000:8000 "ops-api:0.0.0";`
      `docker run --name ops-api -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p 8000:8000 --network=ops-console "${API_IMAGE_ECR_URL(tag)}";`
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

function runFrontend (tag: string, dependencies: string) {
  try {
    logger.info('Launching frontend on localhost:3000');
    const commands = [
      // `docker pull public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}`,
      `docker build --build-arg DEPENDENCIES=${dependencies} -f Dockerfile.ui -t ui:latest . || exit 1`,
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      `docker run --name ops-frontend -i -p 3000:3000 --network=ops-console "${UI_IMAGE_ECR_URL(tag)}";`
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
  if (arch) {
    return arch;
  }
  switch (process.arch) {
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

async function handleExitSignalCleanup (backendProcess?: ChildProcess, frontendProcess?: ChildProcess) {
  async function cleanup () {
    logger.info('Cleaning up...');
    fs.unlink(API_FILEPATH, () => { return; });
    fs.unlink(UI_FILEPATH, () => { return; });
    backendProcess?.kill();
    frontendProcess?.kill();
    await runCommandSync('docker stop ops-frontend ops-api || true; docker network rm ops-console || true');
  }
  process.on('SIGINT', async () => {
    await cleanup();
  });
  process.on('SIGQUIT', async () => {
    await cleanup();
  });
  process.on('SIGTERM', async () => {
    await cleanup();
  }); 
}

async function up (options: UpOptions) {
  const { 
    arch, 
    configFile
  } = options;
  try {
    const { dir, file } = validateConfigFilePath(configFile);
    const tag = validateArchitecture(arch);
    const dependencies = await getDependencies(dir, file);
    await pullDockerFiles(tag);
    await startNetwork();
    const backendProcess = runBackend(tag, dependencies, dir, file);
    const frontendProcess = runFrontend(tag, dependencies);
    await handleExitSignalCleanup(backendProcess, frontendProcess);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred';
    logger.error(message);
  }
}

export {
  up
};