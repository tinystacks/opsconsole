#!/usr/bin/env node

import { Command, Option } from 'commander';
import colors from 'colors';
import { init, up, deploy } from './commands';
import logger from './logger';
const program = new Command();
import { version } from '../package.json';
import { DEFAULT_CONFIG_FILENAME } from './types';

function handleError (error: Error) {
  logger.cliError(error);
  process.exit(1);
}

try {
  colors.enable();

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
    .description('Deploys ops console on TinyStacks hosted solution')
    .action(deploy);

  program.parseAsync()
    .catch(handleError);
} catch (error) {
  handleError(error as Error);
}