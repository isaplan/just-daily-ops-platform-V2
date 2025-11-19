/**
 * Bork Sales Data V2 - Server Component
 * Fetches initial data on server for fast first paint
 */

import { BorkSalesClient } from './BorkSalesClient';
import { fetchBorkSales } from '@/lib/services/sales/bork-sales-v2.service';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default async function BorkSalesV2Page() {
  // ✅ Fetch initial data on server (fast, SSR)
  // Use default filters: this-year preset, all locations, page 1
  // Calculate 'this-year' range on server (can't use client-side function)
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;
  
  // Fetch data in parallel
  const [initialSalesData, locations] = await Promise.all([
    fetchBorkSales({
      startDate,
      endDate,
      page: 1,
      limit: 50,
      locationId: 'all',
      category: 'all',
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
    <BorkSalesClient
      initialData={{
        salesData: initialSalesData.success ? initialSalesData : undefined,
        locations,
      }}
    />
  );
}
