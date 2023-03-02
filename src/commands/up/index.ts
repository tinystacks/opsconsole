import logger from '../../logger';
import { runCommand } from '../../utils/os';

const backendSuccessIndicator = 'Running on http://localhost:8000';
const frontendSuccessIndicator = 'ready - started server on 0.0.0.0:3000';

function runBackend () {
  try {
    const commands = [
      'docker login -u AWS -p $(aws ecr get-login-password --region us-east-1 --profile ts) 849087520365.dkr.ecr.us-east-1.amazonaws.com',
      'docker pull 849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-api',
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      'docker run --name ops-api -v $HOME/.aws:/root/.aws -v $(pwd):/config --env CONFIG_PATH="../config/example.yml" -i -p 8000:8000 "849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-api";'
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(backendSuccessIndicator)) { 
        logger.success('Ops console backend successfully launched');
      }
    });
  } catch (e) {
    logger.error(`Error launching ops console servers: ${e}`);
  }
}

function runFrontend () {
  try {
    const commands = [
      'docker login -u AWS -p $(aws ecr get-login-password --region us-east-1 --profile ts) 849087520365.dkr.ecr.us-east-1.amazonaws.com',
      'docker pull 849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-frontend',
      'docker container stop ops-frontend || true',
      'docker container rm ops-frontend || true',
      'docker run --name ops-frontend -v $HOME/.aws:/root/.aws -i -p 3000:3000 "849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-frontend";'
    ].join(';\n');
    const childProcess = runCommand(commands);
    childProcess.stdout.on('data', (data) => {
      if (data.includes(frontendSuccessIndicator)) { 
        logger.success('Ops console frontend successfully launched');
      }
    });
  } catch (e) {
    logger.error(`Error launching ops console servers: ${e}`);
  }
}

async function up () {
  runBackend();
  runFrontend();
}

export {
  up
};