/**
 * Daily Sales - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML is pre-rendered with data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { BorkSalesClient } from './BorkSalesClient';
import { getDailySales } from '@/lib/services/graphql/queries';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function DailySalesPage() {
  // Use default filters: this-month preset, all locations, page 1, first 50 items
  // Calculate this-month date range directly (can't use client-side function)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Start of current month
  const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
  
  // End of current month
  const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
  const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Fetch initial data on server (first 50 items for fast paint)
  const [initialSalesData, locations] = await Promise.all([
    getDailySales(startDate, endDate, 1, 50, undefined).catch(() => null),
    getLocations().catch(() => []),
  ]);

  return (
    <BorkSalesClient 
      initialData={{
        salesData: initialSalesData || undefined,
        locations: locations || [],
      }}
    />
  );
}
