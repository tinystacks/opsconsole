const mockJoin = jest.fn();
const mockReadFileSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerSucces = jest.fn();

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: mockJoin
}));

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync
}));

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
  });
  it('creates template from sample config', async () => {
    mockJoin.mockReturnValue('./samples/layout-sample.yml');
    mockReadFileSync.mockReturnValue('example');

    await init();

    expect(mockJoin).toBeCalled();
    expect(mockJoin).toBeCalledWith(expect.any(String), '../../../samples', 'layout-sample.yml');
    
    expect(mockReadFileSync).toBeCalled();
    expect(mockReadFileSync).toBeCalledWith('./samples/layout-sample.yml');

    expect(mockWriteFileSync).toBeCalled();
    expect(mockWriteFileSync).toBeCalledWith('./config.yml', 'example');
  });
  it('logs error if one occurs', async () => {
    const mockError = new Error('Error!');
    mockReadFileSync.mockImplementationOnce(() => { throw mockError; });

    await init();

    expect(mockReadFileSync).toBeCalled();
    expect(mockLoggerSucces).not.toBeCalled();
    expect(mockWriteFileSync).not.toBeCalled();

    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith(`Error creating example template file: ${mockError}`);
  });
});