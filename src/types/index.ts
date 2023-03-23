export enum ImageArchitecture {
  ARM = 'arm',
  x86 = 'x86'
}

export interface CommonOptions {
  configFile?: string;
}

export interface UpOptions extends CommonOptions {
  arch?: ImageArchitecture;
}

export const DEFAULT_CONFIG_FILENAME = 'config.yml';