import * as fs from 'fs';
import path from 'path';
import { OpenAPIConfig, OpsStackApiClient } from '@tinystacks/ops-stack-client';
import logger from '../../logger';
import { Credentials, GetOptions } from '../../types';
import { TMP_DIR } from '../../constants';

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

async function list (options: GetOptions) {
  try {
    const {
      consoleName
    } = options;
    const { apiKey } = getCredentials();
    const opsStackClient = getClient(apiKey);
    const response = await opsStackClient.allocate.getOpsStack(consoleName);
    logger.stdout(JSON.stringify(response, null, 2));
  } catch (error) {
    logger.error(`Error deploying ops console: ${error}`);
  }
}

export {
  list
};