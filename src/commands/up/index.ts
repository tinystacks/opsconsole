import { exec, execSync, spawnSync } from 'child_process';
import logger from '../../logger';
import { runCommand } from '../../utils/os';

async function up () {
  try {
    const commands = [
      'docker login -u AWS -p $(aws ecr get-login-password --region us-east-1 --profile ts) 849087520365.dkr.ecr.us-east-1.amazonaws.com',
      'docker pull 849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-api',
      'docker container stop ops-api || true',
      'docker container rm ops-api || true',
      'docker run --name ops-api -v $HOME/.aws:/root/.aws -v $(pwd):/config --env CONFIG_PATH="../config/example2.yml" -i -p 8000:8000 "849087520365.dkr.ecr.us-east-1.amazonaws.com/ops-api";'
    ].join(';\n');
    const output = await runCommand(commands);
    // logger.success('Ops console servers successfully launched!\nBackend running on http://localhost:8000.');
  } catch (e) {
    logger.error(`Error launching ops console servers: ${e}`);
  }
}

export {
  up
};