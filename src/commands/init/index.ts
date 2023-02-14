import logger from '../../logger';

function init () {
  try {
    // fs.readFileSync()
    logger.success('Example template successfully created!');
  } catch (e) {
    logger.error(`Error creating example template file: ${e}`);
  }
}

export {
  init
};