export enum ImageArchitecture {
  ARM = 'arm',
  x86 = 'x86'
}

export interface CommonOptions {
  configFile?: string;
  verbose?: boolean;
}

export interface UpOptions extends CommonOptions {
  arch?: ImageArchitecture;
  backendPort?: number;
  frontendPort?: number;
}

export type Credentials = {
  apiKey: string;
  groupName?: string;
};

export type GetOptions = {
  consoleName?: string;
}

export type SignupOptions = {
  os?: NodeJS.Platform;
}
export type OsOutput = {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export type InitOptions = {
  template?: string;
}