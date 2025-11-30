/**
 * Productivity Data Fetcher Service
 * Handles all MongoDB queries and data fetching
 * No business logic - just data retrieval
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { getLocations } from '@/lib/services/graphql/queries';

export interface FetchLaborRecordsParams {
  locationObjIds: ObjectId[];
  start: Date;
  end: Date;
}

export interface FetchSalesRecordsParams {
  locationObjIds: ObjectId[];
  start: Date;
  end: Date;
}

/**
 * Fetch labor records from eitje_aggregated
 * Uses aggregation pipeline to get the MOST RECENT document per location+date
 * (since eitje creates hourly documents, we need the latest one per day)
 */
export async function fetchLaborRecords(
  params: FetchLaborRecordsParams
): Promise<any[]> {
  const db = await getDatabase();
  
  const laborQuery: any = {
    locationId: params.locationObjIds.length === 1 
      ? params.locationObjIds[0] 
      : { $in: params.locationObjIds },
    date: {
      $gte: params.start,
      $lte: params.end,
    },
  };

  // Use aggregation pipeline to get most recent document per location+date
  // Logic: Always group by day (YYYY-MM-DD) to get the latest document per day
  // The aggregation sorts by createdAt DESC first, so $first gives us the most recent
  const laborRecords = await db.collection('eitje_aggregated')
    .aggregate([
      { $match: laborQuery },
      // Sort by createdAt descending first (most recent created = latest hourly update)
      // This ensures we get the latest document when grouping
      { $sort: { createdAt: -1, updatedAt: -1 } },
      // Group by locationId and date (day only, YYYY-MM-DD)
      // This gives us ONE document per location per day (the most recent one)
      {
        $group: {
          _id: {
            locationId: '$locationId',
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$date' }
            }
          },
          // Take the first document (which is the latest due to sort by createdAt DESC)
          latestDoc: { $first: '$$ROOT' },
          totalDocs: { $sum: 1 }, // Count how many documents per day (for debugging)
          latestCreatedAt: { $first: '$createdAt' } // Track when latest was created
        }
      },
      // Replace root with the latest document
      { $replaceRoot: { newRoot: '$latestDoc' } },
      // Sort final results by date descending (most recent dates first)
      { $sort: { date: -1 } }
    ])
    .toArray();
  
  console.log(`[Productivity Data Fetcher] Found ${laborRecords.length} unique location-date combinations`);
  if (laborRecords.length > 0) {
    console.log(`[Productivity Data Fetcher] Date range in results: ${laborRecords[laborRecords.length - 1].date?.toISOString?.()?.split('T')[0]} (oldest) to ${laborRecords[0].date?.toISOString?.()?.split('T')[0]} (newest)`);
  }
  
  return laborRecords;
}

/**
 * Fetch sales records from bork_aggregated
 * Uses aggregation pipeline to get the MOST RECENT document per location+date
 */
export async function fetchSalesRecords(
  params: FetchSalesRecordsParams
): Promise<any[]> {
  const db = await getDatabase();
  
  const salesQuery: any = {
    locationId: params.locationObjIds.length === 1 
      ? params.locationObjIds[0] 
      : { $in: params.locationObjIds },
    date: {
      $gte: params.start,
      $lte: params.end,
    },
  };

  const salesRecords = await db.collection('bork_aggregated')
    .aggregate([
      { $match: salesQuery },
      // Sort by updatedAt descending first
      { $sort: { updatedAt: -1 } },
      // Group by locationId and date (day only), take first (latest)
      {
        $group: {
          _id: {
            locationId: '$locationId',
            date: {
              $dateToString: { format: '%Y-%m-%d', date: '$date' }
            }
          },
          latestDoc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$latestDoc' } },
      { $sort: { date: -1 } }
    ])
    .toArray();

  console.log(`[Productivity Data Fetcher] Found ${salesRecords.length} unique location-date combinations in sales (most recent per day)`);
  
  return salesRecords;
}

/**
 * Fetch location names and create lookup maps
 */
export async function fetchLocationMaps(
  locationIds: string[]
): Promise<{
  locationMap: Map<string, { id: string; name: string }>;
  locationIdMap: Map<string, string>;
}> {
  const locations = await getLocations();
  const validLocations = locations.filter(
    (loc: any) => loc.name !== "All HNHG Locations" && loc.name !== "All HNG Locations"
  );

  const locationMap = new Map<string, { id: string; name: string }>();
  const locationIdMap = new Map<string, string>();
  
  validLocations.forEach((loc: any) => {
    const locIdStr = loc.id.toString();
    locationMap.set(locIdStr, { id: locIdStr, name: loc.name });
    locationIdMap.set(locIdStr, loc.name);
    
    // Also add ObjectId version if different
    if (loc.id && typeof loc.id !== 'string') {
      const objIdStr = loc.id.toString();
      if (objIdStr !== locIdStr) {
        locationIdMap.set(objIdStr, loc.name);
      }
    }
  });

  // Fetch missing location names from database
  const db = await getDatabase();
  const missingLocationIds = new Set<string>();
  
  locationIds.forEach(id => {
    if (!locationIdMap.has(id)) {
      missingLocationIds.add(id);
    }
  });
  
  if (missingLocationIds.size > 0) {
    const locationObjIds = Array.from(missingLocationIds).map(id => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter(Boolean) as ObjectId[];
    
    if (locationObjIds.length > 0) {
      const missingLocations = await db.collection('locations')
        .find({ _id: { $in: locationObjIds } })
        .toArray();
      
      missingLocations.forEach((loc: any) => {
        const locIdStr = loc._id.toString();
        locationIdMap.set(locIdStr, loc.name);
        locationMap.set(locIdStr, { id: locIdStr, name: loc.name });
      });
    }
  }
  
  return { locationMap, locationIdMap };
}

/**
 * Verify we have the latest documents for specific dates
 * Used for debugging to check if aggregation is working correctly
 */
export async function verifyLatestDocuments(
  laborRecords: any[],
  datesToCheck: string[],
  locationIdsToCheck: string[],
  locationIdMap: Map<string, string>,
  locationMap: Map<string, { id: string; name: string }>
): Promise<void> {
  const db = await getDatabase();
  
  console.log(`[Productivity Data Fetcher] Verifying we have the latest documents...`);
  
  for (const dateStr of datesToCheck) {
    for (const locationIdStr of locationIdsToCheck) {
      const checkDate = new Date(dateStr);
      const startOfDay = new Date(checkDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(checkDate);
      endOfDay.setHours(23, 59, 59, 999);
      const locationObjId = new ObjectId(locationIdStr);
      
      // Get ALL documents for this date+location
      const allDocsForDate = await db.collection('eitje_aggregated')
        .find({
          locationId: locationObjId,
          date: { $gte: startOfDay, $lte: endOfDay }
        })
        .sort({ createdAt: -1 })
        .toArray();
      
      if (allDocsForDate.length > 0) {
        const latestDoc = allDocsForDate[0];
        const selectedDoc = laborRecords.find((r: any) => {
          const rDate = r.date instanceof Date ? r.date : new Date(r.date);
          const rDateStr = rDate.toISOString().split('T')[0];
          const rLocId = r.locationId?.toString();
          return rDateStr === dateStr && rLocId === locationIdStr;
        });
        
        const locationName = locationIdMap.get(locationIdStr) || locationMap.get(locationIdStr)?.name || 'Unknown';
        
        console.log(`[Productivity Data Fetcher] Date ${dateStr}, Location ${locationName} (${locationIdStr}):`);
        console.log(`  Total documents for this date: ${allDocsForDate.length}`);
        console.log(`  Latest document: createdAt=${latestDoc.createdAt instanceof Date ? latestDoc.createdAt.toISOString() : latestDoc.createdAt}, totalHoursWorked=${latestDoc.totalHoursWorked}, totalRevenue=${latestDoc.totalRevenue}`);
        
        if (selectedDoc) {
          const isLatest = latestDoc._id.toString() === selectedDoc._id.toString();
          console.log(`  Selected document: createdAt=${selectedDoc.createdAt instanceof Date ? selectedDoc.createdAt.toISOString() : selectedDoc.createdAt}, totalHoursWorked=${selectedDoc.totalHoursWorked}, totalRevenue=${selectedDoc.totalRevenue}`);
          console.log(`  Is latest: ${isLatest}`);
          
          if (!isLatest) {
            console.warn(`  ⚠️ WARNING: Selected document is NOT the latest!`);
            console.warn(`    Selected: createdAt=${selectedDoc.createdAt instanceof Date ? selectedDoc.createdAt.toISOString() : selectedDoc.createdAt}, totalHoursWorked=${selectedDoc.totalHoursWorked}`);
            console.warn(`    Latest: createdAt=${latestDoc.createdAt instanceof Date ? latestDoc.createdAt.toISOString() : latestDoc.createdAt}, totalHoursWorked=${latestDoc.totalHoursWorked}`);
          }
        } else {
          console.warn(`  ⚠️ WARNING: No document found in laborRecords for this date+location!`);
        }
      }
    }
  }
}




