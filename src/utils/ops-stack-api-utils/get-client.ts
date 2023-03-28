import { OpenAPIConfig, OpsStackApiClient } from '@tinystacks/ops-stack-client';

export function getClient (apiKey: string) {
  // FIXME: Replace with prod endpoint once it's deployed
  const baseEndpoint = 'https://rbxfvmjh4e.execute-api.us-west-2.amazonaws.com';
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