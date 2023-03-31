export enum ImageArchitecture {
  ARM = 'arm',
  x86 = 'x86'
}

export interface UpOptions {
  arch?: ImageArchitecture;
  configFile?: string;
}

export interface OsOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const DEFAULT_CONFIG_FILENAME = 'config.yml';

export function API_IMAGE_ECR_URL (tag: string) {
  return `public.ecr.aws/tinystacks/ops-api:latest${tag ? `-${tag}` : ''}`;
}

export function UI_IMAGE_ECR_URL (tag: string) {
  return `public.ecr.aws/tinystacks/ops-frontend:latest${tag ? `-${tag}` : ''}`;
}