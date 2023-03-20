import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { ConsoleParser } from '@tinystacks/ops-core';
import { YamlConsole } from '@tinystacks/ops-model';
import logger from '../../logger/index.js';
import { runCommand, runCommandSync } from '../../utils/os/index.js';
import { DEFAULT_CONFIG_FILENAME, ImageArchitecture, UpOptions } from '../../types/index.js';
import { ChildProcess } from 'child_process';

const BACKEND_SUCCESS_INDICATOR = 'Running on http://localhost:8000';
const FRONTEND_SUCCESS_INDICATOR = 'ready - started server on 0.0.0.0:3000';

function installDependencies (dir: string, file: string) {
  try {
    const configFile = fs.readFileSync(`${dir}/${file}`);
    const configJson = (yaml.load(configFile.toString()) as any)?.Console as YamlConsole;
    const parsedYaml = ConsoleParser.parse(configJson);
    const dependencyDir = `/tmp/${parsedYaml.name}`;
    fs.rmSync(dependencyDir, { recursive: true, force: true });
    fs.mkdirSync(dependencyDir, { recursive: true });
    const dependencies = new Set(Object.values(parsedYaml.dependencies));
    logger.info('Installing dependencies...');
    const installString = Array.from(dependencies).join(' ');
    runCommandSync(`npm i --prefix ${dependencyDir} ${installString}`);
    logger.success('Dependencies installed');
    return parsedYaml.name;
  } catch (e) {
    logger.error('Failed to install dependencies. Please verify that your yaml template is formatted correctly.');
    throw e;
  }
}

function startNetwork () {
  try {
    logger.info('Launching opsconsole docker network');
    const commands = [
      'docker network rm ops-console',
      'docker network create -d bridge ops-console'
    ].join('\n');
    runCommandSync(commands);
  } catch (e) {
    logger.error('Error launching ops console network');
    throw e;
  }
}

function runBackend (tag?: string, dir?: string, file?: string, consoleName?: string) {
  try {
    logger.info('Launching backend on localhost:8000');
    const commands = [
      `docker pull public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}`,
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      `docker run --name ops-api -v /tmp/${consoleName}:/dependencies -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" --env MOUNTED_DEPENDENCIES=true -i -p 8000:8000 --network=ops-console "public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}";`
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

function runFrontend (tag?: string, consoleName?: string) {
  try {
    logger.info('Launching frontend on localhost:3000');
    const commands = [
      `docker pull public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}`,
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      `docker run --name ops-frontend -v /tmp/${consoleName}:/dependencies --env MOUNTED_DEPENDENCIES=true -i -p 3000:3000 --network=ops-console "public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}";`
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

function validateTemplateFilePath (template: string) {
  const absolutePath = path.resolve(template || `${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);
  if (fs.existsSync(absolutePath)) {
    return {
      dir: path.dirname(absolutePath),
      file: path.basename(absolutePath)
    };
  }
  throw new Error(`Specified config file ${absolutePath} does not exist.`);
}

function handleExitSignalCleanup (backendProcess: ChildProcess, frontendProcess: ChildProcess) {
  function cleanup () {
    logger.info('Cleaning up...');
    backendProcess.kill();
    frontendProcess.kill();
    runCommandSync('docker stop ops-frontend ops-api || true; docker network rm ops-console');
  }
  process.on('SIGINT', () => {
    cleanup();
  });
  process.on('SIGQUIT', () => {
    cleanup();
  });
  process.on('SIGTERM', () => {
    cleanup();
  }); 
}

async function up (options: UpOptions) {
  const { 
    arch, 
    template
  } = options;
  try {
    const { dir, file } = validateTemplateFilePath(template);
    const tag = validateArchitecture(arch);
    const consoleName = installDependencies(dir, file);
    startNetwork();
    const backendProcess = runBackend(tag, dir, file, consoleName);
    const frontendProcess = runFrontend(tag, consoleName);
    handleExitSignalCleanup(backendProcess, frontendProcess);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred';
    logger.error(message);
  }
}

export {
  up
};