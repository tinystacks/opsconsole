import { execSync } from 'child_process';
import logger from '../../logger';
import { SignupOptions } from '../../types';

function signup (options: SignupOptions = {}) {
  const {
    os = process.platform
  } = options;
  try { 
    let openCommand;
    switch (os) {
      case 'darwin':
        openCommand = 'open';
        break;
      case 'win32':
        openCommand = 'start';
        break;
      default:
        openCommand = 'xdg-open';
        break;
    }
    execSync(`${openCommand} https://ops.tinystacks.com`);
  } catch (e) {
    logger.error(`Error during signup: ${e}`);
  }
}

export {
  signup
};