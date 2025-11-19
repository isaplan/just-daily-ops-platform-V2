/**
 * SSR Demo Page - Server Component
 * 
 * This demonstrates the Server Component + Client Component pattern
 * for fast initial page loads with SSR + ISR caching
 */

import { DemoSSRClient } from './DemoSSRClient';
import { getDatabase } from '@/lib/mongodb/v2-connection';

// ✅ Add ISR revalidation - page will be cached at CDN
export const revalidate = 1800; // 30 minutes

export default async function DemoSSRPage() {
  // ✅ Fetch data on server (fast, SSR)
  const db = await getDatabase();
  
  // Fetch locations count as example
  const locationsCount = await db.collection('locations').countDocuments({ isActive: true });
  
  // Fetch sample data
  const sampleLocations = await db.collection('locations')
    .find({ isActive: true })
    .limit(5)
    .toArray();
  
  const initialData = {
    locationsCount,
    locations: sampleLocations.map((loc: any) => ({
      id: loc._id.toString(),
      name: loc.name,
      code: loc.code,
    })),
    serverFetchTime: new Date().toISOString(),
  };
  
  // ✅ Pass server data to client component
  return <DemoSSRClient initialData={initialData} />;
}

