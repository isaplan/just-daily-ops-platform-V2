/**
 * GraphQL Mutations
 * 
 * All GraphQL mutation queries for the application
 */

import { executeGraphQL } from './client';

export interface ApiCredentialInput {
  locationId?: string;
  provider: string;
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  additionalConfig?: Record<string, any>;
  isActive?: boolean;
}

export interface ApiCredential {
  id: string;
  locationId?: string;
  provider: string;
  baseUrl?: string;
  additionalConfig?: Record<string, any>;
  isActive: boolean;
}

/**
 * Create a new API credential
 */
export async function createApiCredential(
  input: ApiCredentialInput
): Promise<ApiCredential> {
  const mutation = `
    mutation CreateApiCredential($input: ApiCredentialInput!) {
      createApiCredential(input: $input) {
        id
        locationId
        provider
        baseUrl
        additionalConfig
        isActive
      }
    }
  `;

  const result = await executeGraphQL<{ createApiCredential: ApiCredential }>(
    mutation,
    { input }
  );

  if (!result.data?.createApiCredential) {
    throw new Error('Failed to create API credential');
  }

  return result.data.createApiCredential;
}

/**
 * Update an existing API credential
 */
export async function updateApiCredential(
  id: string,
  input: ApiCredentialInput
): Promise<ApiCredential> {
  const mutation = `
    mutation UpdateApiCredential($id: ID!, $input: ApiCredentialInput!) {
      updateApiCredential(id: $id, input: $input) {
        id
        locationId
        provider
        baseUrl
        additionalConfig
        isActive
      }
    }
  `;

  const result = await executeGraphQL<{ updateApiCredential: ApiCredential }>(
    mutation,
    { id, input }
  );

  if (!result.data?.updateApiCredential) {
    throw new Error('Failed to update API credential');
  }

  return result.data.updateApiCredential;
}

/**
 * Delete an API credential
 */
export async function deleteApiCredential(id: string): Promise<boolean> {
  const mutation = `
    mutation DeleteApiCredential($id: ID!) {
      deleteApiCredential(id: $id)
    }
  `;

  const result = await executeGraphQL<{ deleteApiCredential: boolean }>(
    mutation,
    { id }
  );

  if (!result.data?.deleteApiCredential) {
    throw new Error('Failed to delete API credential');
  }

  return result.data.deleteApiCredential;
}






