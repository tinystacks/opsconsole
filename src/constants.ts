const TMP_DIR = '/tmp/.ops-console';
const DEFAULT_CONFIG_FILENAME = 'config.yml';
function API_IMAGE_ECR_URL (tag: string) {
  return `public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}`;
}

function UI_IMAGE_ECR_URL (tag: string) {
  return `public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}`;
}

export {
  TMP_DIR,
  DEFAULT_CONFIG_FILENAME,
  API_IMAGE_ECR_URL,
  UI_IMAGE_ECR_URL
};