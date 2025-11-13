/**
 * Hours V2 Service Layer
 * Server-side data fetching functions
 */

import { HoursV2QueryParams, HoursV2Response, ProcessedHoursRecord, AggregatedHoursRecord } from '@/models/eitje-v2/hours-v2.model';

/**
 * Fetch processed hours data from API
 */
export async function fetchProcessedHours(
  params: HoursV2QueryParams
): Promise<HoursV2Response> {
  const urlParams = new URLSearchParams({
    startDate: params.startDate || '',
    endDate: params.endDate || '',
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.environmentId) {
    urlParams.append('environmentId', params.environmentId.toString());
  }
  if (params.teamId) {
    urlParams.append('teamId', params.teamId.toString());
  }
  if (params.teamName) {
    urlParams.append('teamName', params.teamName);
    console.log('[Service] Adding teamName to URL:', params.teamName);
  }
  if (params.typeName !== undefined) {
    if (params.typeName === null) {
      // Special case: "Gewerkte Uren" - send as empty string to indicate null filter
      urlParams.append('typeName', '');
    } else {
      urlParams.append('typeName', params.typeName);
    }
  }
  if (params.userId) {
    urlParams.append('userId', params.userId.toString());
  }

  const url = `/api/eitje/v2/processed-hours?${urlParams}`;
  console.log('[Service] Fetching URL:', url);
  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch processed hours');
  }

  return data;
}

/**
 * Fetch aggregated hours data from API
 */
export async function fetchAggregatedHours(
  params: HoursV2QueryParams
): Promise<HoursV2Response> {
  const urlParams = new URLSearchParams({
    startDate: params.startDate || '',
    endDate: params.endDate || '',
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.environmentId) {
    urlParams.append('environmentId', params.environmentId.toString());
  }
  if (params.teamId) {
    urlParams.append('teamId', params.teamId.toString());
  }
  if (params.teamName) {
    urlParams.append('teamName', params.teamName);
  }
  if (params.typeName !== undefined) {
    // For "Gewerkte Uren" (null), send empty string to indicate null filter
    if (params.typeName === null) {
      urlParams.append('typeName', '');
    } else {
      urlParams.append('typeName', params.typeName);
    }
  }
  if (params.userId) {
    urlParams.append('userId', params.userId.toString());
  }

  const response = await fetch(`/api/eitje/v2/aggregated-hours?${urlParams}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch aggregated hours');
  }

  return data;
}

