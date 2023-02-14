import logger from '../../logger';

function up () {
  try {
    logger.success('Ops console servers successfully launched!');
  } catch (e) {
    logger.error(`Error launching ops console servers: ${e}`);
  }
}

export {
  up
};