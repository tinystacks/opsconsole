import * as fs from 'fs';
import path from 'path';
import logger from '../../logger';

function init () {
  const example = fs.readFileSync(path.join(__dirname, '../../../', 'example.yml'));
  const dirname = './example.yml';
  try { 
    fs.writeFileSync(dirname, example);
    logger.success('Example template successfully created!');
  } catch (e) {
    logger.error(`Error creating example template file: ${e}`);
  }
}

export {
  init
};