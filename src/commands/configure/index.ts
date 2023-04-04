import * as fs from 'fs';
import path from 'path';
import prompts, { PromptObject } from 'prompts';
import logger from '../../logger';
import { TMP_DIR } from '../../constants';

async function configure () {
  try { 
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const questions: PromptObject[] = [
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your TinyStacks API key.  If you do not have one, create one at https://ops.tinystacks.com'
      }
      // {
      //   type: 'text',
      //   name: 'groupName',
      //   message: 'Enter your TinyStacks group name if this stack will be co-owned'
      // }
    ];
    const credentials = await prompts(questions);
    fs.writeFileSync(path.join(TMP_DIR, 'credentials'), JSON.stringify(credentials));
  } catch (e) {
    logger.error(`An error occured during configure: ${e}`);
  }
}

export {
  configure
};