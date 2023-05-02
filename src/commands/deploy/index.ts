import * as fs from 'fs';
import path from 'path';
import HttpError from 'http-errors';
import { HostedOpsConsole, OpsStackApiClient, Status } from '@tinystacks/ops-stack-client';
import logger from '../../logger';
import { CommonOptions } from '../../types';
import { parseConfig } from '../../utils/config';
import { DEFAULT_CONFIG_FILENAME } from '../../constants';
import { getCredentials, getClient } from '../../utils/ops-stack-api-utils';
import { getSpinner } from '../../utils/spinner';
import { sleep } from '../../utils/os';

async function checkIfConsoleExists (consoleName: string, opsStackClient: OpsStackApiClient): Promise<boolean | never> {
  try {
    const consoleStacks = await opsStackClient.allocate.getOpsStacks(consoleName);
    const [consoleStack] = consoleStacks || [];
    if (consoleStack && consoleStack.name === consoleName) return true;
    throw consoleStack;
  } catch (e) {
    const error = e as any;
    if (error.status === 404) {
      return false;
    }
    throw error;

  }
}

async function waitForStackToSync (opsStackClient: OpsStackApiClient, consoleName: string): Promise<void> {
  const tenSeconds = 10 * 1000;
  await sleep(tenSeconds);
  
  const consoleStacks = await opsStackClient.allocate.getOpsStacks(consoleName);
  const [consoleStack] = consoleStacks || [];
  if (consoleStack && consoleStack.name === consoleName) {
    if (consoleStack.status === Status.IN_SYNC) {
      return;
    } else if (consoleStack.status === Status.SYNC_FAILED) {
      throw new Error('Failed to deploy ops console!');
    }
    return waitForStackToSync(opsStackClient, consoleName);
  }
  throw consoleStack;
}

async function deploy (options: CommonOptions) {
  const spinner = await getSpinner({
    text: 'Initializing...',
    color: 'blue'
  });
  try {
    const {
      configFile
    } = options;
    const absolutePath = path.resolve(configFile || `${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);
    const configFileContents = fs.readFileSync(absolutePath).toString();
    const console = await parseConfig(absolutePath);
    const { name } = console;
    const { apiKey } = getCredentials();
    const opsStackClient = getClient(apiKey);
    const consoleExists = await checkIfConsoleExists(name, opsStackClient);
    spinner.start();
    let response: HostedOpsConsole | HttpError.HttpError;
    if (consoleExists) {
      response = await opsStackClient.allocate.updateOpsStack(name, configFileContents);
    } else {
      response = await opsStackClient.allocate.createOpsStack(configFileContents);
    }
    if (HttpError.isHttpError(response)) {
      throw response;
    }
    spinner.text = 'Deploying...';
    spinner.color = 'green';
    await waitForStackToSync(opsStackClient, name);
    spinner.stop();
    logger.success('Successfully deployed ops console!');
    logger.stdout(JSON.stringify(response, null, 2));
  } catch (error) {
    spinner.stop();
    logger.error(`Error deploying ops console: ${error}`);
  }
}

export {
  deploy
};