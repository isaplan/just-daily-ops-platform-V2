/**
 * Workers - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { WorkersClient } from './WorkersClient';
import { getWorkerProfiles } from '@/lib/services/graphql/queries';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function WorkersPage() {
  // Use default filters: current year, all locations, page 1, first 50 items
  const currentYear = new Date().getFullYear();

  // Fetch initial 50 items from aggregated collections (fast, < 500ms)
  const [initialWorkersData, locations] = await Promise.all([
    getWorkerProfiles(currentYear, null, null, 1, 50, {}).catch(() => null),
    getLocations().catch(() => []),
  ]);

  return (
    <WorkersClient
      initialData={{
        workersData: initialWorkersData || undefined,
        locations: locations || [],
      }}
    />
  );
}
