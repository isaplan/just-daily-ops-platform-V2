/**
 * Productivity By Location - Server Component
 * ✅ SSR with ISR - Lightweight server component
 */

import { ProductivityByLocationClient } from './ProductivityByLocationClient';

// ✅ ISR revalidation - page cached at CDN for 30 minutes
export const revalidate = 1800;

export default function ProductivityByLocationPage() {
  return (
    <ProductivityByLocationClient
      initialData={{
        locations: [],
      }}
    />
  );
}




