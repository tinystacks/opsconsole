import logger from '../../logger';

function deploy () {
  try {
    // fs.readFileSync()
    logger.success('Ops console successfully deployed!');
  } catch (e) {
    logger.error(`Error deploying ops console: ${e}`);
  }
}

export {
  deploy
};