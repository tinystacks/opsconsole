import * as fs from 'fs';
import * as path from 'path';
import logger from '../../logger';
import { runCommand } from '../../utils/os';
import { ImageArchitecture, UpOptions } from '../../types';

const backendSuccessIndicator = 'Running on http://localhost:8000';
const frontendSuccessIndicator = 'ready - started server on 0.0.0.0:3000';

function startNetwork () {
  try {
    const commands = [
      'docker network rm ops-console 2> /dev/null',
      'docker network create -d bridge ops-console 2> /dev/null'
    ].join('\n');
    runCommand(commands);
  } catch (e) {
    logger.error(`Error launching ops console network: ${e}`);
  }
}

function runBackend (tag?: string, dir?: string, file?: string) {
  try {
    const commands = [
      `docker pull public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}`,
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      `docker run --name ops-api -v $HOME/.aws:/root/.aws -v ${dir}:/config --env CONFIG_PATH="../config/${file}" -i -p 8000:8000 --network=ops-console "public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}";`
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(backendSuccessIndicator)) { 
        logger.success('Ops console backend successfully launched');
      }
    });
  } catch (e) {
    logger.error(`Error launching ops console backend: ${e}`);
  }
}

function runFrontend (tag?: string) {
  try {
    const commands = [
      `docker pull public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}`,
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      `docker run --name ops-frontend -i -p 3000:3000 --network=ops-console "public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}";`
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(frontendSuccessIndicator)) {
        logger.success('Ops console frontend successfully launched');
      }
    });
  } catch (e) {
    logger.error(`Error launching ops console frontend: ${e}`);
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
  if (!configFile) {
    return {
      dir: process.cwd(),
      file: 'example.yml'
    };
  }
  const absolutePath = path.resolve(configFile);
  if (fs.existsSync(absolutePath)) {
    return {
      dir: path.dirname(absolutePath),
      file: path.basename(absolutePath)
    };
  }
  throw new Error(`Specified config file ${configFile} does not exist`);
}

async function up (options: UpOptions) {
  const { 
    arch, 
    configFile
  } = options;
  try {
    const { dir, file } = validateConfigFilePath(configFile);
    const tag = validateArchitecture(arch);
    startNetwork();
    runBackend(tag, dir, file);
    runFrontend(tag);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An unknown error occurred';
    logger.error(message);
  }
}

export {
  up
};