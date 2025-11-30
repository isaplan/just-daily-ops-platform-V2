/**
 * Productivity By Division - Server Component
 */

import { ProductivityByDivisionClient } from './ProductivityByDivisionClient';

export const revalidate = 1800;

export default function ProductivityByDivisionPage() {
  return (
    <ProductivityByDivisionClient
      initialData={{
        locations: [],
      }}
    />
  );
}


