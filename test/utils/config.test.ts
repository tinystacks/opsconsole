const mockReadFileSync = jest.fn();
const mockLoad = jest.fn();
const mockParse = jest.fn();
const mockGetConsoleParser = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync
}));

jest.mock('js-yaml', () => ({
  load: mockLoad
}));

jest.mock('../../src/utils/ops-core', () => ({
  getConsoleParser: mockGetConsoleParser
}));

const mockConsoleParser = {
  parse: mockParse
};

import { parseConfig } from '../../src/utils/config';

const mockConfigYaml = 'Console: name: console';
const mockConfigJson = {
  Console: {
    name: 'console',
    providers: {}, 
    dashboards: {},
    widgets: {},
    dependencies: {}
  }
};
const mockConsle = { name: 'console' };

describe('config utils', () => {
  beforeEach(() => {
    mockGetConsoleParser.mockResolvedValue(mockConsoleParser as never);
  });
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('parseConfig', async () => {
    mockReadFileSync.mockReturnValue(mockConfigYaml);
    mockLoad.mockReturnValue(mockConfigJson);
    mockParse.mockReturnValue(mockConsle);

    const result = await parseConfig('config.yml');

    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith('config.yml');

    expect(mockLoad).toBeCalled();
    expect(mockLoad).toBeCalledWith(mockConfigYaml);

    expect(mockParse).toBeCalled();
    expect(mockParse).toBeCalledWith(mockConfigJson.Console);

    expect(result).toEqual(mockConsle);
  });
});