const mockGetSpinner = jest.fn();
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockRunCommandSync = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerSucces = jest.fn();

jest.mock('../../src/utils/os', () => ({
  runCommandSync: mockRunCommandSync
}));

jest.mock('../../src/utils/spinner', () => ({
  getSpinner: mockGetSpinner
}));

jest.mock('../../src/logger', () => ({
  error: mockLoggerError,
  success: mockLoggerSucces
}))

import { update } from '../../src/commands/update';

describe('update', () => {
  beforeEach(() => {
    delete process.env.VERBOSE;
    mockGetSpinner.mockResolvedValue({
      start: mockStart,
      stop: mockStop
    });
  });
  afterEach(() => {
    // for mocks
    jest.resetAllMocks();
    // for spies
    jest.restoreAllMocks();
  });
  it('does not start spinner if verbose flag is on', async () => {
    process.env.VERBOSE = 'true';
    mockRunCommandSync.mockResolvedValueOnce({ exitCode: 0 });
    mockRunCommandSync.mockResolvedValueOnce({ stdout: '\n->@tinystacks/opc-cli@latest\n' });

    await update();

    expect(mockGetSpinner).toBeCalled();
    expect(mockStart).not.toBeCalled();
    expect(mockRunCommandSync).toBeCalledTimes(2);
    expect(mockStop).toBeCalled();
    expect(mockLoggerSucces).toBeCalled();
    expect(mockLoggerSucces).toBeCalledWith('Successfully updated ops-cli to version latest!');
  });
  it('logs error on non-zero exit code', async () => {
    mockRunCommandSync.mockResolvedValueOnce({ exitCode: 1 });

    await update();

    expect(mockGetSpinner).toBeCalled();
    expect(mockStart).toBeCalled();
    expect(mockRunCommandSync).toBeCalledTimes(1);
    expect(mockStop).toBeCalled();
    expect(mockLoggerError).toBeCalled();
    expect(mockLoggerError).toBeCalledWith('Failed to update ops-cli!');
  });
  it('logs success if update succeeds but list fails', async () => {
    mockRunCommandSync.mockResolvedValueOnce({ exitCode: 0 });
    mockRunCommandSync.mockResolvedValueOnce({ stdout: '', exitCode: 1 });

    await update();

    expect(mockGetSpinner).toBeCalled();
    expect(mockStart).toBeCalled();
    expect(mockRunCommandSync).toBeCalledTimes(2);
    expect(mockStop).toBeCalled();
    expect(mockLoggerSucces).toBeCalled();
    expect(mockLoggerSucces).toBeCalledWith('Successfully updated ops-cli!');
  });
  it('logs new version when update and list succeed', async () => {
    mockRunCommandSync.mockResolvedValueOnce({ exitCode: 0 });
    mockRunCommandSync.mockResolvedValueOnce({ stdout: '', exitCode: 1 });

    await update();

    expect(mockGetSpinner).toBeCalled();
    expect(mockGetSpinner).toBeCalledWith({
      text: 'Updating...',
      color: 'green'
    });
    
    expect(mockStart).toBeCalled();

    expect(mockRunCommandSync).toBeCalledTimes(2);
    expect(mockRunCommandSync).toBeCalledWith('npm i -g @tinystacks/ops-cli@latest');
    expect(mockRunCommandSync).toBeCalledWith('npm list -g @tinystacks/ops-cli');
    
    expect(mockStop).toBeCalled();
    
    expect(mockLoggerSucces).toBeCalled();
    expect(mockLoggerSucces).toBeCalledWith('Successfully updated ops-cli!');
  });
});