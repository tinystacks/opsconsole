import prompts from '../mocks/MockPrompts';
const mockJoin = jest.fn();
const mockResolve = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerSucces = jest.fn();
const mockLoad = jest.fn();
const mockDump = jest.fn();

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: mockJoin,
  resolve: mockResolve
}));

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync
}));

jest.mock('js-yaml', () => ({
  load: mockLoad,
  dump: mockDump
}));

jest.mock('prompts', () => prompts);

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  success: mockLoggerSucces
}))

import { init } from '../../src/commands/init';

describe('init', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
    prompts.mockReset();
  });
  it('creates config from sample if no template is passed', async () => {
    const configPath = './samples/layout-sample.yml';
    const mockConfigYaml = 'Console: {}';
    const mockConfigJson = { Console: { constants: {} } };
    mockJoin.mockReturnValue(configPath);
    mockResolve.mockReturnValue(configPath);
    mockReadFileSync.mockReturnValue(mockConfigYaml);
    mockLoad.mockReturnValue(mockConfigJson)
    mockDump.mockReturnValue(mockConfigYaml)

    await init();

    expect(mockJoin).toBeCalled();
    expect(mockJoin).toBeCalledWith(expect.any(String), '../../../samples', 'layout-sample.yml');
    
    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith(configPath);

    expect(mockLoad).toBeCalled();
    expect(mockLoad).toBeCalledWith(mockConfigYaml);
    
    expect(mockDump).toBeCalled();
    expect(mockDump).toBeCalledWith(mockConfigJson);

    expect(mockWriteFileSync).toBeCalled();
    expect(mockWriteFileSync).toBeCalledWith('./config.yml', mockConfigYaml);
    
    expect(mockLoggerSucces).toBeCalled()
    expect(mockLoggerSucces).toBeCalledWith('Successfully initialized config file from template layout-sample.yml!');
  });
  it('creates config from specified template if passed', async () => {
    const configPath = './template.yml';
    const mockConfigYaml = 'Console: {}';
    const mockConfigJson = { Console: { constants: {} } };
    mockJoin.mockReturnValue(configPath);
    mockResolve.mockReturnValue(configPath);
    mockReadFileSync.mockReturnValue(mockConfigYaml);
    mockLoad.mockReturnValue(mockConfigJson)
    mockDump.mockReturnValue(mockConfigYaml)

    await init({ template: configPath });

    expect(mockJoin).toBeCalled();
    expect(mockJoin).toBeCalledWith(expect.any(String), '../../../samples', 'layout-sample.yml');
    
    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith(configPath);

    expect(mockLoad).toBeCalled();
    expect(mockLoad).toBeCalledWith(mockConfigYaml);
    
    expect(mockDump).toBeCalled();
    expect(mockDump).toBeCalledWith(mockConfigJson);

    expect(mockWriteFileSync).toBeCalled();
    expect(mockWriteFileSync).toBeCalledWith('./config.yml', mockConfigYaml);
    
    expect(mockLoggerSucces).toBeCalled()
    expect(mockLoggerSucces).toBeCalledWith('Successfully initialized config file from template template.yml!');
  });
  it('prompts for constant values in template', async () => {
    const configPath = './template.yml';
    const mockConfigYaml = 'Console: {}';
    const inputConfigJson = {
      Console: {
        constants: {
          stringConst: {
            value: 'foo'
          },
          numConst: {
            value: 1,
            type: 'number'
          },
          boolConst: {
            value: false,
            type: 'boolean'
          },
          dateConst: {
            value: '2023-05-01',
            type: 'date'
          }
        }
      }
    };
    const outputConfigJson = {
      Console: {
        constants: {
          stringConst: {
            value: 'bar'
          },
          numConst: {
            value: 2,
            type: 'number'
          },
          boolConst: {
            value: true,
            type: 'boolean'
          },
          dateConst: {
            value: '2023-05-02',
            type: 'date'
          }
        }
      }
    };
    mockJoin.mockReturnValue(configPath);
    mockResolve.mockReturnValue(configPath);
    mockReadFileSync.mockReturnValue(mockConfigYaml);
    mockLoad.mockReturnValue(inputConfigJson)
    mockDump.mockReturnValue(mockConfigYaml)
    prompts.mockReturnValueOnce({
      stringConst: 'bar'
    });
    prompts.mockReturnValueOnce({
      numConst: 2
    });
    prompts.mockReturnValueOnce({
      boolConst: true
    });
    prompts.mockReturnValueOnce({
      dateConst: '2023-05-02'
    });

    await init({ template: configPath });

    expect(mockJoin).toBeCalled();
    expect(mockJoin).toBeCalledWith(expect.any(String), '../../../samples', 'layout-sample.yml');
    
    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith(configPath);

    expect(mockLoad).toBeCalled();
    expect(mockLoad).toBeCalledWith(mockConfigYaml);

    expect(prompts).toBeCalled();
    expect(prompts).toBeCalledTimes(4);
    expect(prompts).toBeCalledWith({
      name: 'stringConst',
      message: 'stringConst',
      type: 'text',
      initial: 'foo'
    });
    expect(prompts).toBeCalledWith({
      name: 'numConst',
      message: 'numConst',
      type: 'number',
      initial: 1
    });
    expect(prompts).toBeCalledWith({
      name: 'boolConst',
      message: 'boolConst',
      type: 'toggle',
      initial: false,
      active: 'true',
      inactive: 'false'
    });
    expect(prompts).toBeCalledWith({
      name: 'dateConst',
      message: 'dateConst',
      type: 'date',
      initial: new Date('2023-05-01')
    });
    
    expect(mockDump).toBeCalled();
    expect(mockDump).toBeCalledWith(outputConfigJson);

    expect(mockWriteFileSync).toBeCalled();
    expect(mockWriteFileSync).toBeCalledWith('./config.yml', mockConfigYaml);
    
    expect(mockLoggerSucces).toBeCalled();
    expect(mockLoggerSucces).toBeCalledWith('Successfully initialized config file from template template.yml!');
  });
  it('logs error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockReadFileSync.mockImplementationOnce(() => { throw mockError; });

    await init();

    expect(mockReadFileSync).toBeCalled();
    expect(mockLoggerSucces).not.toBeCalled();
    expect(mockWriteFileSync).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error initializing config file: ${mockError}`);
  });
});