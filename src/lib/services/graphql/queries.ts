/**
 * GraphQL Queries
 * 
 * All GraphQL query operations for the application
 */

import { executeGraphQL } from './client';

export interface ApiCredential {
  id: string;
  locationId?: string;
  provider: string;
  baseUrl?: string;
  additionalConfig?: Record<string, any>;
  isActive: boolean;
}

/**
 * Get API credentials by provider
 */
export async function getApiCredentials(
  provider?: string,
  locationId?: string
): Promise<ApiCredential[]> {
  const query = `
    query GetApiCredentials($provider: String, $locationId: ID) {
      apiCredentials(provider: $provider, locationId: $locationId) {
        id
        locationId
        provider
        baseUrl
        additionalConfig
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ apiCredentials: ApiCredential[] }>(
    query,
    { provider, locationId }
  );

  return result.data?.apiCredentials || [];
}

/**
 * Get a single API credential by ID
 */
export async function getApiCredential(id: string): Promise<ApiCredential | null> {
  const query = `
    query GetApiCredential($id: ID!) {
      apiCredential(id: $id) {
        id
        locationId
        provider
        baseUrl
        additionalConfig
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ apiCredential: ApiCredential | null }>(
    query,
    { id }
  );

  return result.data?.apiCredential || null;
}

export interface Location {
  id: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all locations
 */
export async function getLocations(): Promise<Location[]> {
  const query = `
    query GetLocations {
      locations {
        id
        name
        code
        address
        city
        country
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const result = await executeGraphQL<{ locations: Location[] }>(query);
  return result.data?.locations || [];
}

export interface LaborData {
  id: string;
  location: Location;
  date: string;
  totalHoursWorked: number;
  totalWageCost: number;
  totalRevenue: number;
  laborCostPercentage: number;
  revenuePerHour: number;
  teamStats?: Array<{
    team: {
      id: string;
      name: string;
    };
    hours: number;
    cost: number;
  }>;
  createdAt: string;
}

/**
 * Get aggregated labor data
 */
export async function getLaborAggregated(
  locationId: string,
  startDate: string,
  endDate: string
): Promise<LaborData[]> {
  const query = `
    query GetLaborAggregated($locationId: ID!, $startDate: String!, $endDate: String!) {
      laborAggregated(locationId: $locationId, startDate: $startDate, endDate: $endDate) {
        id
        location {
          id
          name
          code
        }
        date
        totalHoursWorked
        totalWageCost
        totalRevenue
        laborCostPercentage
        revenuePerHour
        createdAt
      }
    }
  `;

  const result = await executeGraphQL<{ laborAggregated: LaborData[] }>(
    query,
    { locationId, startDate, endDate }
  );

  return result.data?.laborAggregated || [];
}

