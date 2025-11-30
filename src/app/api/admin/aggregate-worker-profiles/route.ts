/**
 * POST /api/admin/aggregate-worker-profiles
 * Aggregate all worker profiles and build worker_profiles_aggregated collection
 * Can be called:
 * - Manually via POST request
 * - Via cron job (hourly)
 * - After eitje sync completes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { buildWorkerAggregated } from '@/lib/services/workforce/worker-aggregation.service';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('\n[Worker Profiles Aggregation] ====== STARTING WORKER AGGREGATION ======');
    console.log('[Worker Profiles Aggregation] Fetching all worker profiles...');

    const db = await getDatabase();

    // Fetch all worker profiles
    const workerProfiles = await db.collection('worker_profiles')
      .find({})
      .toArray();

    console.log(`[Worker Profiles Aggregation] Found ${workerProfiles.length} worker profiles`);

    if (workerProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No worker profiles to aggregate',
        processed: 0,
        errors: 0,
      });
    }

    // Build location map for name lookups
    const locations = await db.collection('locations')
      .find({})
      .toArray();

    const locationMap = new Map<string, string>();
    locations.forEach((loc: any) => {
      locationMap.set(loc._id?.toString() || '', loc.name || 'Unknown Location');
    });

    console.log(`[Worker Profiles Aggregation] Location map built: ${locationMap.size} locations`);

    // ✅ Build user name map from unified_users (correct data source!)
    console.log('[Worker Profiles Aggregation] Building user name map from unified_users...');
    const unifiedUsers = await db.collection('unified_users')
      .find({ isActive: true })
      .toArray();

    const userNameMap = new Map<number, string>(); // Map from eitje_user_id to user name
    unifiedUsers.forEach((user: any) => {
      if (user.systemMappings && Array.isArray(user.systemMappings)) {
        const eitjeMapping = user.systemMappings.find((m: any) => m.system === 'eitje');
        if (eitjeMapping && eitjeMapping.externalId) {
          const eitjeUserId = parseInt(eitjeMapping.externalId);
          if (!isNaN(eitjeUserId)) {
            // Use firstName + lastName or name from unified_users
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const name = user.name || '';
            const fullName = (firstName && lastName) 
              ? `${firstName} ${lastName}`.trim()
              : name || '';
            
            if (fullName) {
              userNameMap.set(eitjeUserId, fullName);
            }
          }
        }
      }
    });

    console.log(`[Worker Profiles Aggregation] User name map built: ${userNameMap.size} users from unified_users`);
    if (userNameMap.size > 0) {
      console.log('[Worker Profiles Aggregation] Sample mappings:', Array.from(userNameMap.entries()).slice(0, 3));
    }
    
    // Fallback: If no names found in unified_users, try eitje_raw_data
    if (userNameMap.size === 0) {
      console.log('[Worker Profiles Aggregation] No names in unified_users, trying eitje_raw_data as fallback...');
      const eitjeUsers = await db.collection('eitje_raw_data')
        .find({ endpoint: 'users' })
        .toArray();

      eitjeUsers.forEach((record: any) => {
        const extracted = record.extracted || record.rawApiResponse || {};
        const eitjeUserId = extracted.id || extracted.userId;
        const firstName = extracted.first_name || extracted.firstName || '';
        const lastName = extracted.last_name || extracted.lastName || '';
        
        if (eitjeUserId && (firstName || lastName) && !userNameMap.has(eitjeUserId)) {
          const fullName = `${firstName} ${lastName}`.trim();
          if (fullName) {
            userNameMap.set(eitjeUserId, fullName);
          }
        }
      });
      
      console.log(`[Worker Profiles Aggregation] Fallback: Added ${userNameMap.size} names from eitje_raw_data`);
    }

    // Aggregate each worker
    let processed = 0;
    let errors = 0;
    const bulkOps: any[] = [];

    for (const profile of workerProfiles) {
      try {
        const locationId = profile.location_id;
        const locationName = locationId ? locationMap.get(typeof locationId === 'string' ? locationId : locationId.toString()) : undefined;
        
        // ✅ Fetch user name from unified_users
        const userName = userNameMap.get(profile.eitje_user_id) || null;
        if (!userName) {
          console.warn(`[Worker Profiles Aggregation] ⚠️  No user name found for eitje_user_id ${profile.eitje_user_id}`);
        }

        const aggregated = await buildWorkerAggregated(profile, locationName, userName);

        if (aggregated) {
          // Prepare upsert operation
          // ⚠️ MongoDB doesn't allow updating the _id field - remove it from the update
          const { _id, ...aggregatedWithoutId } = aggregated;
          
          bulkOps.push({
            updateOne: {
              filter: { eitjeUserId: profile.eitje_user_id },
              update: { $set: aggregatedWithoutId },
              upsert: true,
            },
          });

          processed++;

          if (processed % 50 === 0) {
            console.log(`[Worker Profiles Aggregation] Processed ${processed}/${workerProfiles.length} workers...`);
          }
        } else {
          errors++;
          console.warn(`[Worker Profiles Aggregation] Failed to aggregate worker ${profile.eitje_user_id}`);
        }
      } catch (error) {
        errors++;
        console.error(`[Worker Profiles Aggregation] Error aggregating worker ${profile.eitje_user_id}:`, error);
      }
    }

    // Perform bulk write if we have operations
    if (bulkOps.length > 0) {
      console.log(`[Worker Profiles Aggregation] Writing ${bulkOps.length} aggregated records to database...`);

      const result = await db.collection('worker_profiles_aggregated')
        .bulkWrite(bulkOps);

      console.log(`[Worker Profiles Aggregation] ✅ Bulk write complete:`, {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      });
    }

    // Verify aggregation
    const aggregatedCount = await db.collection('worker_profiles_aggregated')
      .countDocuments({});

    console.log(`[Worker Profiles Aggregation] Total records in worker_profiles_aggregated: ${aggregatedCount}`);
    console.log(`[Worker Profiles Aggregation] ====== AGGREGATION COMPLETE ======\n`);

    return NextResponse.json({
      success: true,
      message: 'Worker profiles aggregated successfully',
      processed,
      errors,
      bulkWriteOperations: bulkOps.length,
      totalAggregated: aggregatedCount,
    });
  } catch (error: any) {
    console.error('[Worker Profiles Aggregation] ❌ Fatal error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to aggregate worker profiles',
      },
      { status: 500 }
    );
  }
}
