import * as fs from 'fs';
import yaml from 'js-yaml';
import { YamlConsole, Console } from '@tinystacks/ops-model';
import { getConsoleParser } from '../ops-core';

export async function parseConfig (file: string, parentDirectory?: string): Promise<Console> {
  const ConsoleParser = await getConsoleParser();
  const filePath = parentDirectory ? `${parentDirectory}/${file}`: file;
  const configFile = fs.readFileSync(filePath);
  const configJson = (yaml.load(configFile.toString()) as any)?.Console as YamlConsole;
  return ConsoleParser.parse(configJson);
}