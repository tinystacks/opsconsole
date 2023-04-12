import path from 'path';

const TMP_DIR = '/tmp/.ops-console';
const DEFAULT_CONFIG_FILENAME = 'config.yml';
function API_IMAGE_ECR_URL (tag: string) {
  return `public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}`;
}

function UI_IMAGE_ECR_URL (tag: string) {
  return `public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}`;
}

class Platform {
  static ExitSuccess = process.platform === 'win32' ? 'VER>NUL' : 'true';
  static Home = process.platform === 'win32' ? '%USERPROFILE%' : '$HOME';
  static ApiFilePath = path.normalize('./Dockerfile.api');
  static UiFilePath = path.normalize('./Dockerfile.ui');
  static AwsConfigPath = path.normalize(`${this.Home}/.aws`);
}

const SEP = ' && ';

export {
  TMP_DIR,
  DEFAULT_CONFIG_FILENAME,
  API_IMAGE_ECR_URL,
  UI_IMAGE_ECR_URL,
  Platform,
  SEP
};