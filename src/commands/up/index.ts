import logger from '../../logger';
import { runCommand } from '../../utils/os';
import { UpOptions } from '../types';

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

function runBackend (tag: string) {
  try {
    const commands = [
      'docker login -u AWS -p $(aws ecr get-login-password --region us-east-1 --profile ts) 849087520365.dkr.ecr.us-east-1.amazonaws.com',
      `docker pull 849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-api:latest-${tag}`,
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      `docker run --name ops-api -v $HOME/.aws:/root/.aws -v $(pwd):/config --env CONFIG_PATH="../config/example.yml" -i -p 8000:8000 --network=ops-console "849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-api:latest-${tag}";`
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

function runFrontend (tag: string) {
  try {
    const commands = [
      'docker login -u AWS -p $(aws ecr get-login-password --region us-east-1 --profile ts) 849087520365.dkr.ecr.us-east-1.amazonaws.com',
      `docker pull 849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-frontend:latest-${tag}`,
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      `docker run --name ops-frontend -i -p 3000:3000 --network=ops-console "849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-frontend:latest-${tag}";`
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

async function up (options: UpOptions) {
  startNetwork();
  const { arm } = options;
  const tag = arm ? 'arm' : 'x86';
  runBackend(tag);
  runFrontend(tag);
}

export {
  up
};