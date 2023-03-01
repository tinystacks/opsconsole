#!/usr/bin/env node

import { Command } from 'commander';
import * as colors from 'colors';
import { init, up, deploy } from './commands';
import logger from './logger';
const program = new Command();
// eslint-disable-next-line
const { version } = require('../package.json');

function handleError (error: Error) {
  logger.cliError(error);
  process.exit(1);
}

try {
  colors.enable();

  program
    .name('opsconsole-cli')
    .description('TinyStacks opsconsole command line interface')
    .version(version);

  program.command('init')
    .description('Creates a template file from the example shown in the README')
    .action(init);

  program.command('up')
    .description('Deploys ops console on local servers')
    .action(up);

  program.command('deploy')
    .description('Deploys ops console on TinyStacks hosted solution')
    .action(deploy);

  program.parseAsync()
    .catch(handleError);
} catch (error) {
  handleError(error as Error);
}