import * as fs from 'fs';
import yaml from 'js-yaml';
import { YamlConsole, Console } from '@tinystacks/ops-model';
import { getConsoleParser } from '../ops-core';
import { runCommandSync } from '../os';
import logger from '../../logger';
import { ExecSignalError } from '../../errors/exec-signal-error';
import { Platform } from '../../constants';

export async function parseConfig (file: string, parentDirectory?: string): Promise<Console> {
  const ConsoleParser = await getConsoleParser();
  const filePath = parentDirectory ? `${parentDirectory}/${file}`: file;
  const configFile = fs.readFileSync(filePath);
  const configJson = (yaml.load(configFile.toString()) as any)?.Console as YamlConsole;
  return ConsoleParser.parse(configJson);
}

export async function validateDependencies (dependencies: string[]) {
  const dependenciesNotFound: string[] = [];
  for (const dependency of dependencies) {
    await runCommandSync(`npm view ${dependency} > ${Platform.Null} 2>&1`).catch((e) => {
      if (e instanceof ExecSignalError) {
        throw e;
      }
      dependenciesNotFound.push(dependency);
    });
  }
  if (dependenciesNotFound.length) {
    logger.error(`The following dependencies could not be found:\n- ${dependenciesNotFound.join('\n- ')}`);
    throw new Error('Dependencies not found');
  }
}