const mockReadFileSync = jest.fn();
const mockLoad = jest.fn();
const mockParse = jest.fn();
const mockGetConsoleParser = jest.fn();
const mockRunCommandSync = jest.fn();
const mockLoggerError = jest.fn();

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

jest.mock('../../src/utils/os', () => ({
  runCommandSync: mockRunCommandSync
}));

jest.mock('../../src/logger', () => ({
  error: mockLoggerError
}));

import { ExecSignalError } from '../../src/errors';
import { parseConfig, validateDependencies } from '../../src/utils/config';

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
  describe('validateDependencies', () => {
    it('throws exec signal error', async () => {
      const signalError = new ExecSignalError('SIGINT')
      mockRunCommandSync.mockRejectedValue(signalError);

      let thrownError;
      try {
        await validateDependencies(['widgets_1']);
      } catch (e) {
        thrownError = e;
      } finally {
        expect(thrownError).toBeDefined();
        expect(thrownError).toEqual(signalError);
      }
    });
    it('throws error if any dependencies are not found', async () => {
      mockRunCommandSync.mockRejectedValueOnce(new Error('Error!'));
      mockRunCommandSync.mockResolvedValueOnce({});

      let thrownError;
      try {
        await validateDependencies(['widgets_1', 'widgets_2']);
      } catch (e) {
        thrownError = e;
      } finally {
        expect(mockLoggerError).toBeCalled();
        expect(mockLoggerError).toBeCalledWith('The following dependencies could not be found:\n- widgets_1');

        expect(thrownError).toBeDefined();
        expect(thrownError).toEqual(new Error('Dependencies not found'));
      }
    });
  });
});