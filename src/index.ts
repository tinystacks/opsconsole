#!/usr/bin/env node

import { Command, Option } from 'commander';
import colors from 'colors';
import { init, up, deploy } from './commands/index.js';
import logger from './logger/index.js';
const program = new Command();
import packagejson from '../package.json' assert { type: 'json' };

function handleError (error: Error) {
  logger.cliError(error);
  process.exit(1);
}

try {
  colors.enable();

  program
    .name('opsconsole-cli')
    .description('TinyStacks opsconsole command line interface')
    .version(packagejson.version, '-v, -V, --version');

  program.command('init')
    .description('Creates a template file from the example shown in the README')
    .action(init);

  program.command('up')
    .description('Deploys ops console on local servers')
    .addOption(new Option('-a, --arch <arch>', 'Specifies which architecture to use: arm or x86.  Leave blank to allow auto-selection based on current OS.').choices(['arm', 'x86']))
    .option('-t, --template <template>', 'Specifies a config file path. Looks for example.yml in the current working directory by default.')
    .action(up);

  program.command('deploy')
    .description('Deploys ops console on TinyStacks hosted solution')
    .action(deploy);

  program.parseAsync()
    .catch(handleError);
} catch (error) {
  handleError(error as Error);
}