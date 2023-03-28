export enum ImageArchitecture {
  ARM = 'arm',
  x86 = 'x86'
}

export interface UpOptions {
  arch?: ImageArchitecture;
  template?: string;
}

export interface OsOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const DEFAULT_CONFIG_FILENAME = 'config.yml';