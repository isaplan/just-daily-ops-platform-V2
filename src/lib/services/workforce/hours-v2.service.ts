/**
 * Hours V2 Service Layer
 * Server-side data fetching functions - Updated for GraphQL/MongoDB V2
 */

import { HoursV2QueryParams, HoursV2Response, ProcessedHoursRecord, AggregatedHoursRecord } from '@/models/workforce/hours-v2.model';
import { getProcessedHours, getAggregatedHours, HoursFilters } from '@/lib/services/graphql/queries';

/**
 * Fetch processed hours data from GraphQL API
 */
export async function fetchProcessedHours(
  params: HoursV2QueryParams
): Promise<HoursV2Response> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: HoursFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.environmentId) {
    filters.environmentId = params.environmentId;
  }
  if (params.teamName) {
    filters.teamName = params.teamName;
  }
  if (params.typeName !== undefined) {
    // Use a special marker for "worked hours" instead of empty string
    // This ensures GraphQL always receives a value and can filter correctly
    filters.typeName = params.typeName === null ? 'WORKED' : params.typeName;
  }
  if (params.userId) {
    filters.userId = params.userId;
  }

  const result = await getProcessedHours(
    params.startDate,
    params.endDate,
    params.page,
    params.limit,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch processed hours');
  }

  return {
    success: result.success,
    records: result.records as ProcessedHoursRecord[],
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  };
}

/**
 * Fetch aggregated hours data from GraphQL API
 */
export async function fetchAggregatedHours(
  params: HoursV2QueryParams
): Promise<HoursV2Response> {
  if (!params.startDate || !params.endDate) {
    throw new Error('startDate and endDate are required');
  }

  const filters: HoursFilters = {};
  
  if (params.locationId && params.locationId !== 'all') {
    filters.locationId = params.locationId;
  }
  if (params.environmentId) {
    filters.environmentId = params.environmentId;
  }
  if (params.teamName) {
    filters.teamName = params.teamName;
  }
  if (params.typeName !== undefined) {
    // Use a special marker for "worked hours" instead of empty string
    // This ensures GraphQL always receives a value and can filter correctly
    filters.typeName = params.typeName === null ? 'WORKED' : params.typeName;
  }
  if (params.userId) {
    filters.userId = params.userId;
  }

  const result = await getAggregatedHours(
    params.startDate,
    params.endDate,
    params.page,
    params.limit,
    Object.keys(filters).length > 0 ? filters : undefined
  );

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch aggregated hours');
  }

  return {
    success: result.success,
    records: result.records as AggregatedHoursRecord[],
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  };
}






