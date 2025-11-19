/**
 * Hours V2 - Server Component
 * Fetches initial data on server for fast first paint
 */

import { HoursClient } from './HoursClient';
import { fetchProcessedHours } from '@/lib/services/workforce/hours-v2.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default async function HoursV2Page() {
  // ✅ Fetch initial data on server (fast, SSR)
  // Use default filters: this-year preset, all locations, page 1
  // Calculate 'this-year' range on server (can't use client-side function)
  const now = new Date();
  const startDate = `${now.getFullYear()}-01-01`;
  const endDate = `${now.getFullYear()}-12-31`;
  
  // Fetch data in parallel
  const [initialProcessedData, locations] = await Promise.all([
    fetchProcessedHours({
      startDate,
      endDate,
      page: 1,
      limit: 50,
      locationId: 'all',
    }).catch(() => ({
      success: false,
      records: [],
      total: 0,
      page: 1,
      totalPages: 0,
    })),
    getLocations().catch(() => []),
  ]);
  
  // ✅ Pass server-fetched data to client component
  return (
    <HoursClient
      initialData={{
        processedData: initialProcessedData.success ? initialProcessedData : undefined,
        locations,
      }}
    />
  );
}
