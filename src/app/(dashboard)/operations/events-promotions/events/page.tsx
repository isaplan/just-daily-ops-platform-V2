/**
 * Events - Server Component
 * Manage events and promotions with support for single and repeating events
 */

import { EventsClient } from './EventsClient';

// ✅ ISR revalidation
export const revalidate = 600; // 10 minutes

export default async function EventsPage() {
  // Server-side data fetching can be added here if needed
  return <EventsClient />;
}











