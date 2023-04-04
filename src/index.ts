#!/usr/bin/env node

import { Command, Option } from 'commander';
import * as colors from 'colors';
import {
  configure,
  deploy,
  init,
  list,
  signup,
  up
} from './commands';
import logger from './logger';
const program = new Command();
import { DEFAULT_CONFIG_FILENAME } from './constants';

function handleError (error: Error) {
  logger.cliError(error);
  process.exit(1);
}

try {
  colors.enable();

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { version } = require('../package.json');
  program
    .name('ops-cli')
    .description('TinyStacks opsconsole command line interface')
    .version(version, '-v, --version');

  program.command('init')
    .description('Creates a template file from the example shown in the README')
    .action(init);

  program.command('up')
    .description('Deploys ops console on local servers')
    .addOption(new Option('-a, --arch <arch>', 'Specifies which architecture to use: arm or x86.  Leave blank to allow auto-selection based on current OS.').choices(['arm', 'x86']))
    .option('-c, --config-file <config-file>', `Specifies a config file path. See the samples folder in this repo for sample config files. Looks for ${DEFAULT_CONFIG_FILENAME}.yml in the current working directory by default.`)
    .action(up);

  program.command('deploy')
    .description('Deploys ops console on a TinyStacks hosted solution. Requires a free account and an API key.')
    .option('-c, --config-file <config-file>', 'Specifies a config file path. Looks for config.yml in the current working directory by default.')
    .action(deploy);
  
  program.command('configure')
    .description('Prompts for configuration information including an API token that will be used for deploying your console as a hosted solution.  Not necessary for running locally via the "up" command.')
    .action(configure);

  program.command('signup')
    .description('Open signup portal to creating/managing account and API tokens.  Not necessary for running locally via the "up" command.')
    .action(signup);

  program.command('list')
    .description('List the details of your existing hosted consoles. Requires a paid account and an API key.')
    .option('-n, --console-name <console-name>', 'Specifies a console name to looks up details for a specific hosted console. If left blank details for all of your host consoles will be listed.')
    .action(list);

  program.parseAsync()
    .catch(handleError);
} catch (error) {
  handleError(error as Error);
}