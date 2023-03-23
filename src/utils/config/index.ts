import * as fs from 'fs';
import yaml from 'js-yaml';
import { ConsoleParser } from '@tinystacks/ops-core';
import { YamlConsole, Console } from '@tinystacks/ops-model';

export function parseConfig (file: string, parentDirectory?: string): Console {
  const filePath = parentDirectory ? `${parentDirectory}/${file}`: file;
  const configFile = fs.readFileSync(filePath);
  const configJson = (yaml.load(configFile.toString()) as any)?.Console as YamlConsole;
  return ConsoleParser.parse(configJson);
}