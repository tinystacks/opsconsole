import logger from '../../logger';
import { OsOutput } from '../../types';
import { runCommandSync } from '../../utils/os';
import { getSpinner } from '../../utils/spinner';

async function update () {
  const spinner = await getSpinner({
    text: 'Updating...',
    color: 'green'
  });
  if (process.env.VERBOSE !== 'true') {
    spinner.start();
  }
  const {
    exitCode
  } = await runCommandSync('npm i -g @tinystacks/ops-cli@latest').catch(e => e);
  if (exitCode !== 0) {
    spinner.stop();
    logger.error('Failed to update ops-cli!');
    return;
  }
  const { stdout } = await runCommandSync('npm list -g @tinystacks/ops-cli').catch(() => ({} as OsOutput));

  spinner.stop();

  const newVersion = stdout?.split('\n')?.at(1)?.split('@')?.at(2);
  if (!newVersion) {
    logger.success('Successfully updated ops-cli!');
    return;
  }

  logger.success(`Successfully updated ops-cli to version ${newVersion}!`);
  return;
}

export {
  update
};