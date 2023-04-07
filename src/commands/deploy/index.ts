import * as fs from 'fs';
import path from 'path';
import HttpError from 'http-errors';
import { HostedOpsConsole, OpsStackApiClient } from '@tinystacks/ops-stack-client';
import logger from '../../logger';
import { CommonOptions } from '../../types';
import { parseConfig } from '../../utils/config';
import { DEFAULT_CONFIG_FILENAME } from '../../constants';
import { getCredentials, getClient } from '../../utils/ops-stack-api-utils';

async function checkIfConsoleExists (consoleName: string, opsStackClient: OpsStackApiClient): Promise<boolean | never> {
  try {

    const consoleStacks = await opsStackClient.allocate.getOpsStack(consoleName);
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

async function deploy (options: CommonOptions) {
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
    let response: HostedOpsConsole | HttpError.HttpError;
    if (consoleExists) {
      response = await opsStackClient.allocate.updateOpsStack(name, configFileContents);
    } else {
      response = await opsStackClient.allocate.createOpsStack(configFileContents);
    }
    if (HttpError.isHttpError(response)) {
      throw response;
    }
    logger.success('Successful started ops console deployment!');
    logger.stdout(JSON.stringify(response, null, 2));
  } catch (error) {
    logger.error(`Error deploying ops console: ${error}`);
  }
}

export {
  deploy
};