import * as fs from 'fs';
import path from 'path';
import logger from '../../logger';

function init () {
  try { 
    const example = fs.readFileSync(path.join(__dirname, '../../../samples', 'layout-sample.yml'));
    const dirname = './config.yml';
    fs.writeFileSync(dirname, example);
    logger.success('Example template successfully created!');
  } catch (e) {
    logger.error(`Error creating example template file: ${e}`);
  }
}

export {
  init
};