import * as fs from 'fs';
import * as path from 'path';
import { Credentials } from '../../types';
import { TMP_DIR } from '../../constants';
import logger from '../../logger';

function tryToReadFile (filePath: string): string {
  try {
    const file = fs.readFileSync(filePath).toString();
    const fileContents = file?.toString();
    return fileContents;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.verbose(`Could not read file ${filePath}! File does not exist!`);
    } else {
      logger.verbose(`Failed to read file ${filePath}! ${error}`);
    }
    return undefined;
  }
}

function tryToParse (jsonString: string): any {
  try {
    const json = JSON.parse(jsonString);
    return json;
  } catch {
    return undefined;
  }
}

export function getCredentials (): Credentials {
  const credsFile = tryToReadFile(path.join(TMP_DIR, 'credentials'));
  const creds: any = tryToParse(credsFile);
  if (!creds?.apiKey) {
    throw new Error('Cannot find credentials! Try running "opsconsole configure" and try again.');
  }
  return creds;
}