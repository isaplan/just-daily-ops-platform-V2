/**
 * Eitje Data Check - Server Component
 * 
 * Nested page under Data & Status for verifying Excel data against aggregated database
 */

import { EitjeDataCheckClient } from './EitjeDataCheckClient';

// ISR revalidation: 5 minutes (300 seconds)
export const revalidate = 300;

export default async function EitjeDataCheckPage() {
  return <EitjeDataCheckClient />;
}

