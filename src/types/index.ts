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

export type Credentials = {
  apiKey: string;
  groupName?: string;
};

export type GetOptions = {
  consoleName: string;
}