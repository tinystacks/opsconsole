export enum ImageArchitecture {
  ARM = 'arm',
  x86 = 'x86'
}

export interface UpOptions {
  arch?: ImageArchitecture;
  configFile?: string;
}

export const DEFAULT_CONFIG_FILENAME = 'config.yml';