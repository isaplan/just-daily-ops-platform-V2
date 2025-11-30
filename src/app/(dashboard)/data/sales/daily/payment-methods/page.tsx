/**
 * Payment Methods - Server Component
 * ✅ SSR with ISR - Fetches initial data on server for fast first paint
 * HTML structure is pre-rendered with initial data and cached at CDN edge
 * Client component uses initialData for instant display, then updates client-side
 */

import { PaymentMethodsClient } from './PaymentMethodsClient';
import { getPaymentMethodStats } from '@/lib/services/graphql/queries';
import { getLocations } from '@/lib/services/graphql/queries';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

// ✅ SSR: Fetch initial data on server for fast first paint
export default async function PaymentMethodsPage() {
  // Use default filters: this-year preset, all locations
  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  // Fetch initial data from aggregated collections (fast, < 500ms)
  const [initialPaymentData, locations] = await Promise.all([
    getPaymentMethodStats(startDate, endDate, {}).catch(() => null),
    getLocations().catch(() => []),
  ]);

  return (
    <PaymentMethodsClient
      initialData={{
        paymentData: initialPaymentData || undefined,
        locations: locations || [],
      }}
    />
  );
}
