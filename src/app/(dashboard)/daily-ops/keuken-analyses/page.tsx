/**
 * Daily Ops Keuken Analyses Page - Server Component
 * ✅ STATIC HTML - No async work, instant CDN cache
 * HTML structure is pre-rendered and cached at CDN edge
 * Client component fetches ALL data after HTML is painted
 */

import { KeukenAnalysesClient } from "./KeukenAnalysesClient";

// ✅ ISR revalidation - page cached at CDN for 30 minutes
// ✅ STATIC: No async work = instant HTML generation = instant CDN cache
export const revalidate = 1800;

// ✅ COMPLETELY STATIC - No async, no data fetching, just HTML structure
// This allows ISR to cache HTML instantly (< 50ms) at CDN edge
// Client component handles ALL data fetching after HTML is painted
export default function KeukenAnalysesPage() {
  // ✅ Return static HTML structure immediately - no async work
  // Client component fetches keuken analyses data after HTML is ready
  return <KeukenAnalysesClient initialData={undefined} />;
}

