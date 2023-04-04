// This file is a proxy for the dynamic import we use to import ops-core
// We created this abstraction as a workaround for jest/node intermittently failing with segmentation fault when dealing with inline dynamic imports

export async function getConsoleParser () {
  const { ConsoleParser } = await import('@tinystacks/ops-core');
  return ConsoleParser;
}