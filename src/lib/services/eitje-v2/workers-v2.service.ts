/**
 * Workers V2 Service Layer
 * Server-side data fetching functions
 */

import { WorkersV2QueryParams, WorkersV2Response } from '@/models/eitje-v2/workers-v2.model';

/**
 * Fetch worker profiles from API
 */
export async function fetchWorkerProfiles(
  params: WorkersV2QueryParams
): Promise<WorkersV2Response> {
  const urlParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
  });

  if (params.year) {
    urlParams.append('year', params.year.toString());
  }
  if (params.month) {
    urlParams.append('month', params.month.toString());
  }
  if (params.day) {
    urlParams.append('day', params.day.toString());
  }
  if (params.locationId && params.locationId !== 'all') {
    urlParams.append('locationId', params.locationId);
  }
  if (params.activeOnly === true) {
    urlParams.append('activeOnly', 'true');
  } else if (params.activeOnly === false) {
    urlParams.append('activeOnly', 'false');
  }

  const url = `/api/eitje/v2/worker-profiles?${urlParams}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch worker profiles');
  }

  return data;
}

