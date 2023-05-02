import logger from '../../logger';
import { GetOptions } from '../../types';
import { getCredentials, getClient } from '../../utils/ops-stack-api-utils';

async function list (options: GetOptions = {}) {
  try {
    const {
      consoleName
    } = options;
    const { apiKey } = getCredentials();
    const opsStackClient = getClient(apiKey);
    const response = await opsStackClient.allocate.getOpsStacks(consoleName);
    logger.stdout(JSON.stringify(response, null, 2));
  } catch (error) {
    logger.error(`Error listing ops consoles: ${error}`);
  }
}

export {
  list
};