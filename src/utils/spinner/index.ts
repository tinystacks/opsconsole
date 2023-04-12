// This file is a proxy for the dynamic import we use to import ora
// We created this abstraction as a workaround for jest/node intermittently failing with segmentation fault when dealing with inline dynamic imports

export type GetSpinnerArguments = {
  text: string,
  color: string
};

export type Spinner = GetSpinnerArguments & {
  start: () => void;
  stop: () => void;
}


export async function getSpinner (args: GetSpinnerArguments): Promise<Spinner> {
  const ora = await import('ora');
  return ora.default(args as any);
}