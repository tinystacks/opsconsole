const mockReadFileSync = jest.fn();
const mockLoggerVerbose = jest.fn();

jest.mock('fs', () => ({
  readFileSync: mockReadFileSync
}));

jest.mock('../../src/logger', () => ({
  verbose: mockLoggerVerbose
}));

import { getCredentials } from '../../src/utils/ops-stack-api-utils/get-credentials';

describe('get-credentials', () => {
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('logs an error if the credentials file does not exist', () => {
    const mockError = new Error('ENOENT: no such file or directory, open \'/tmp/.ops-console/credentials\'') as any;
    mockError.code = 'ENOENT';
    mockReadFileSync.mockImplementationOnce(() => { throw mockError; });

    let thrownError: any;
    try {
      getCredentials();
    } catch (error) {
      thrownError = error;
    } finally {
      expect(mockReadFileSync).toBeCalled();
      expect(mockReadFileSync).toBeCalledWith('/tmp/.ops-console/credentials');
  
      expect(mockLoggerVerbose).toBeCalled();
      expect(mockLoggerVerbose).toBeCalledWith('Could not read file /tmp/.ops-console/credentials! File does not exist!');
      
      expect(thrownError.message).toEqual('Cannot find credentials! Try running "opsconsole configure" and try again.');
    }
  });
  it('logs an error if any other error occurs during file read', () => {
    const mockError = new Error('Error!');
    mockReadFileSync.mockImplementationOnce(() => { throw mockError; });

    let thrownError: any;
    try {
      getCredentials();
    } catch (error) {
      thrownError = error;
    } finally {
      expect(mockReadFileSync).toBeCalled();
      expect(mockReadFileSync).toBeCalledWith('/tmp/.ops-console/credentials');

      expect(mockLoggerVerbose).toBeCalled();
      expect(mockLoggerVerbose).toBeCalledWith(`Failed to read file /tmp/.ops-console/credentials! ${mockError}`);

      expect(thrownError.message).toEqual('Cannot find credentials! Try running "opsconsole configure" and try again.');
    }
  });
  it('logs an error if the credentials are not in the file', () => {
    mockReadFileSync.mockReturnValueOnce(undefined);

    let thrownError: any;
    try {
      getCredentials();
    } catch (error) {
      thrownError = error;
    } finally {
      expect(mockReadFileSync).toBeCalled();
      expect(mockReadFileSync).toBeCalledWith('/tmp/.ops-console/credentials');

      expect(thrownError.message).toEqual('Cannot find credentials! Try running "opsconsole configure" and try again.');
    }
  });
  it('returns credentials from tmp file', () => {
    const mockCredentials = { apiKey: 'mock-api-key' };
    mockReadFileSync.mockReturnValueOnce(JSON.stringify(mockCredentials));
    
    const result = getCredentials();

    expect(mockLoggerVerbose).not.toBeCalled();

    expect(result).toEqual(mockCredentials);
  });
});