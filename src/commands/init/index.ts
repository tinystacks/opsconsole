import * as fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../../logger';
import prompts, { PromptObject, PromptType } from 'prompts';
import { DEFAULT_CONFIG_FILENAME } from '../../constants';
import { Constant, YamlConsole } from '@tinystacks/ops-model';
import { InitOptions } from '../../types';

function getPromptType (type: Constant.type): PromptType {
  switch (type) {
    case Constant.type.NUMBER:
      return 'number';
    case Constant.type.BOOLEAN:
      return 'toggle';
    case Constant.type.DATE:
      return 'date';
    default:
      return 'text';
  }
}

function makePrompt (constant: Constant, name: string) {
  const {
    value: defaultValue,
    description,
    type: constType = Constant.type.STRING
  } = constant;
  const type = getPromptType(constType);
  const prompt: PromptObject = {
    name,
    message: name,
    type,
    hint: description
  };

  if (type === 'toggle') {
    prompt['initial'] = defaultValue || false;
    prompt['active'] = 'true';
    prompt['inactive'] = 'false';
  } else if (type === 'date') {
    prompt['initial'] = new Date(defaultValue);
  } else {
    prompt['initial'] = defaultValue;
  }

  return prompt;
}

async function promptForConstants (config: YamlConsole): Promise<YamlConsole> {
  const {
    constants = {}
  } = config;
  for (const [key, value] of Object.entries(constants)) {
    const prompt = makePrompt(value, key);
    const userInput = await prompts(prompt);
    constants[key].value = userInput[key];
  }
  config.constants = constants;
  return config;
}

async function init (options: InitOptions = {}) {
  try {
    const {
      template: inputTemplate
    } = options;
    const defaultTemplate = path.join(__dirname, '../../../samples', 'layout-sample.yml');
    const template = inputTemplate || defaultTemplate;
    const configFilePath = path.resolve(template);
    const configContents = fs.readFileSync(configFilePath)?.toString();
    const configJson = (yaml.load(configContents) as any)?.Console as YamlConsole;
    const updatedConfigJson: YamlConsole = await promptForConstants(configJson);
    const updatedConfigYaml = yaml.dump({ Console: updatedConfigJson });
    const destFilePath = `./${DEFAULT_CONFIG_FILENAME}`;
    fs.writeFileSync(destFilePath, updatedConfigYaml);
    logger.success(`Successfully initialized config file from template ${path.basename(template)}!\nTo start the console, run 'opsconsole up -c config.yml'`);
  } catch (e) {
    logger.error(`Error initializing config file: ${e}`);
  }
}

export {
  init
};