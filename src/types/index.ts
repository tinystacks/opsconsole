export enum ImageArchitecture {
  ARM = 'arm',
  x86 = 'x86'
}

export interface UpOptions {
  arch?: ImageArchitecture;
  configFile?: string;
}

export const CONFIG_FILE = 'config.yml';