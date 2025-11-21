/**
 * Manage Menus - Server Component
 * Manage menu cards with products and date ranges
 */

import { MenusClient } from './MenusClient';

// ✅ ISR revalidation
export const revalidate = 600; // 10 minutes

export default async function MenusPage() {
  // Server-side data fetching can be added here if needed
  return <MenusClient />;
}

