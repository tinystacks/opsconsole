import * as fs from 'fs';
import path from 'path';
import HttpError from 'http-errors';
import { HostedOpsConsole, OpenAPIConfig, OpsStackApiClient } from '@tinystacks/ops-stack-client';
import logger from '../../logger';
import { CommonOptions, DEFAULT_CONFIG_FILENAME } from '../../types';
import { parseConfig } from '../../utils/config';

function getClient (apiKey: string) {
  // FIXME: Replace with prod endpoint once it's deployed
  const baseEndpoint = '';
  const clientOptions: Partial<OpenAPIConfig> = {
    BASE: baseEndpoint
  };
  if (apiKey) {
    clientOptions['HEADERS'] = {
      Authorization: apiKey
    };
  }
  return new OpsStackApiClient(clientOptions);
}

function getApiKey () {
  // FIXME: where will the api key live?
  return 'mock-api-key';
}

async function checkIfConsoleExists (consoleName: string, opsStackClient: OpsStackApiClient): Promise<boolean | never> {
  // TODO: How to handle group name?
  const consoleStack = await opsStackClient.allocate.getOpsStack(consoleName);
  if (HttpError.isHttpError(consoleStack)) {
    const httpError = consoleStack as HttpError.HttpError;
    if (httpError.status === 404) {
      return false;
    }
    else {
      throw httpError;
    }
  }
  return true;
}

async function deploy (options: CommonOptions) {
  try {
    const {
      configFile
    } = options;
    const absolutePath = path.resolve(configFile || `${process.cwd()}/${DEFAULT_CONFIG_FILENAME}`);
    const configFileContents = fs.readFileSync(absolutePath).toString();
    const console = parseConfig(absolutePath);
    const { name } = console;
    const apiKey = getApiKey();
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
    logger.success(JSON.stringify(response));
  } catch (error) {
    logger.error(`Error deploying ops console: ${error}`);
  }
}

export {
  deploy
};