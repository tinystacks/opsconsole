// This file is a proxy for the dynamic import we use to import open
// We created this abstraction as a workaround for jest/node intermittently failing with segmentation fault when dealing with inline dynamic imports

export async function getOpen (): Promise<any> {
  const open = await import('open');
  return open;
}