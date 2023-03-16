import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../logger/index.js';
import { DEFAULT_CONFIG_FILENAME } from '../../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function init () {
  try { 
    const example = fs.readFileSync(path.join(__dirname, '../../../../samples', 'layout-sample.yml'));
    const filePath = `./${DEFAULT_CONFIG_FILENAME}`;
    fs.writeFileSync(filePath, example);
    logger.success('Example template successfully created!');
  } catch (e) {
    logger.error(`Error creating example template file: ${e}`);
  }
}

export {
  init
};