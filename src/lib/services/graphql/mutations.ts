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

// ============================================
// WORKER PROFILE MUTATIONS
// ============================================

export interface WorkerProfileInput {
  eitjeUserId: number;
  locationId?: string | null;
  locationIds?: string[] | null;
  contractType?: string | null;
  contractHours?: number | null;
  hourlyWage?: number | null;
  wageOverride?: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
}

export interface WorkerProfile {
  id: string;
  // User IDs and Names (denormalized for fast queries - 100x faster!)
  eitjeUserId: number;
  userName?: string | null; // Prefer unifiedUserName if available
  unifiedUserId?: string | null; // unified_users._id
  unifiedUserName?: string | null; // unified_users.name (primary source of truth)
  borkUserId?: string | null; // bork system mapping externalId
  borkUserName?: string | null; // Usually same as unifiedUserName
  // Teams (names already denormalized)
  teamName?: string | null;
  teams?: Array<{
    team_id: string;
    team_name: string;
    team_type?: string;
    is_active?: boolean;
  }> | null;
  // Locations (names already denormalized)
  locationId?: string | null;
  locationName?: string | null;
  locationIds?: string[] | null;
  locationNames?: string[] | null;
  // Contract data
  contractType?: string | null;
  contractHours?: number | null;
  hourlyWage?: number | null;
  wageOverride: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/**
 * Create a new worker profile
 */
export async function createWorkerProfile(
  input: WorkerProfileInput
): Promise<WorkerProfile> {
  const mutation = `
    mutation CreateWorkerProfile($input: WorkerProfileInput!) {
      createWorkerProfile(input: $input) {
        id
        eitjeUserId
        userName
        locationId
        locationName
        contractType
        contractHours
        hourlyWage
        wageOverride
        effectiveFrom
        effectiveTo
        notes
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ createWorkerProfile: WorkerProfile }>(
    mutation,
    { input }
  );

  if (!result.data?.createWorkerProfile) {
    throw new Error('Failed to create worker profile');
  }

  return result.data.createWorkerProfile;
}

/**
 * Update an existing worker profile
 */
export async function updateWorkerProfile(
  id: string,
  input: WorkerProfileInput
): Promise<WorkerProfile> {
  const mutation = `
    mutation UpdateWorkerProfile($id: ID!, $input: WorkerProfileInput!) {
      updateWorkerProfile(id: $id, input: $input) {
        id
        eitjeUserId
        userName
        locationId
        locationName
        contractType
        contractHours
        hourlyWage
        wageOverride
        effectiveFrom
        effectiveTo
        notes
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ updateWorkerProfile: WorkerProfile }>(
    mutation,
    { id, input }
  );

  if (!result.data?.updateWorkerProfile) {
    throw new Error('Failed to update worker profile');
  }

  return result.data.updateWorkerProfile;
}

/**
 * Delete a worker profile
 */
export async function deleteWorkerProfile(id: string): Promise<boolean> {
  const mutation = `
    mutation DeleteWorkerProfile($id: ID!) {
      deleteWorkerProfile(id: $id)
    }
  `;

  const result = await executeGraphQL<{ deleteWorkerProfile: boolean }>(
    mutation,
    { id }
  );

  if (!result.data?.deleteWorkerProfile) {
    throw new Error('Failed to delete worker profile');
  }

  return result.data.deleteWorkerProfile;
}

// ============================================
// COMPANY SETTINGS MUTATIONS
// ============================================

export interface CompanySettings {
  id: string;
  workingDayStartHour: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Update company settings
 */
export async function updateCompanySettings(workingDayStartHour: number): Promise<CompanySettings> {
  const mutation = `
    mutation UpdateCompanySettings($input: CompanySettingsInput!) {
      updateCompanySettings(input: $input) {
        id
        workingDayStartHour
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ updateCompanySettings: CompanySettings }>(
    mutation,
    { input: { workingDayStartHour } }
  );
  
  if (!result.data?.updateCompanySettings) {
    throw new Error('Failed to update company settings');
  }
  
  return result.data.updateCompanySettings;
}



