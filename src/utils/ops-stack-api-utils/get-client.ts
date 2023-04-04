import { OpenAPIConfig, OpsStackApiClient } from '@tinystacks/ops-stack-client';

export function getClient (apiKey: string) {
  const baseEndpoint = 'https://jag8m0c5f4.execute-api.us-west-2.amazonaws.com';
  const clientOptions: Partial<OpenAPIConfig> = {
    BASE: baseEndpoint
  };
  if (apiKey) {
    clientOptions['HEADERS'] = {
      authorization: apiKey
    };
  }
  return new OpsStackApiClient(clientOptions);
}