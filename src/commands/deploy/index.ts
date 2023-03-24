import * as fs from 'fs';
import path from 'path';
import HttpError from 'http-errors';
import { HostedOpsConsole, OpenAPIConfig, OpsStackApiClient } from '@tinystacks/ops-stack-client';
import logger from '../../logger';
import { CommonOptions, Credentials } from '../../types';
import { parseConfig } from '../../utils/config';
import { DEFAULT_CONFIG_FILENAME, TMP_DIR } from '../../constants';

function getClient (apiKey: string) {
  // FIXME: Replace with prod endpoint once it's deployed
  const baseEndpoint = 'https://rbxfvmjh4e.execute-api.us-west-2.amazonaws.com';
  const clientOptions: Partial<OpenAPIConfig> = {
    BASE: baseEndpoint
  };
  if (apiKey) {
    clientOptions['HEADERS'] = {
      authorization: apiKey
    };
  }
  return new OpsStackApiClient(clientOptions);
}

function getCredentials (): Credentials {
  const credsFile = fs.readFileSync(path.join(TMP_DIR, 'credentials'))?.toString() || '{}';
  const creds: any = JSON.parse(credsFile);
  if (!creds.apiKey) {
    throw new Error('Cannot find credentials! Try running "ops-cli login" and try again.');
  }
  return creds;
}

async function checkIfConsoleExists (consoleName: string, opsStackClient: OpsStackApiClient): Promise<boolean | never> {
  try {

    const consoleStack = await opsStackClient.allocate.getOpsStack(consoleName);
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