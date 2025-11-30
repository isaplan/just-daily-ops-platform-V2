/**
 * Labor Locations & Teams - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { LocationsTeamsClient } from './LocationsTeamsClient';
import { fetchWorkersWithFilters, fetchLocations, fetchTeams } from '@/lib/services/labor/locations-teams.service';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function LocationsTeamsPage() {
  // Use default filters: current year, all locations, all teams, all contract types, page 1, first 50 items
  const currentYear = new Date().getFullYear();

  // Fetch initial 50 items from aggregated collections (fast, < 500ms)
  const [initialWorkersData, locations, teams] = await Promise.all([
    fetchWorkersWithFilters(
      { year: currentYear, month: null, location: 'all', team: 'all', contractType: 'all' },
      1,
      50
    ).catch(() => null),
    fetchLocations().catch(() => []),
    fetchTeams().catch(() => []),
  ]);

  return (
    <LocationsTeamsClient
      initialData={{
        workersData: initialWorkersData || undefined,
        locations: locations || [],
        teams: teams || [],
      }}
    />
  );
}

