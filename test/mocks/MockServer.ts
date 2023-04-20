export class MockServer {
  errorCb: (error: any) => void;
  listeningCb: () => void;
  close: jest.Mock;
  listen: jest.Mock;

  constructor () {
    this.close = jest.fn();
    this.listen = jest.fn();
  }

  once (event: string, callback: (...args: any) => void) {
    if (event === 'error') {
      this.errorCb = callback;
    } else if (event === 'listening') {
      this.listeningCb = callback;
    }
  }
}