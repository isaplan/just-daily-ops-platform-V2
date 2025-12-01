/**
 * Data & Status - Server Component
 * 
 * Server Component wrapper with ISR for Data & Status page
 */

import { DataStatusClient } from './DataStatusClient';

// ISR revalidation: 5 minutes (300 seconds)
export const revalidate = 300;

export default async function DataStatusPage() {
  // Server-side data fetching can be added here if needed in the future
  // For now, all data fetching is handled client-side via ViewModel
  return <DataStatusClient />;
}










