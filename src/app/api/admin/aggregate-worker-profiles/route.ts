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
import { V2_COLLECTIONS } from '@/lib/mongodb/v2-collections';
import { ObjectId } from 'mongodb';

// ✅ Set maximum execution time to 10 minutes (prevents infinite runs)
export const maxDuration = 600; // 10 minutes

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

    // ✅ Build unified user maps from unified_users (correct data source!)
    console.log('[Worker Profiles Aggregation] Building unified user maps from unified_users...');
    const unifiedUsers = await db.collection('unified_users')
      .find({ isActive: true })
      .toArray();

    // Maps from eitje_user_id to unified user data
    const userNameMap = new Map<number, string>(); // eitjeUserId -> userName
    const unifiedUserMap = new Map<number, { id: ObjectId; name: string; borkId?: string }>(); // eitjeUserId -> unified user info
    
    unifiedUsers.forEach((user: any) => {
      if (user.systemMappings && Array.isArray(user.systemMappings)) {
        const eitjeMapping = user.systemMappings.find((m: any) => m.system === 'eitje');
        const borkMapping = user.systemMappings.find((m: any) => m.system === 'bork');
        
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
            
            // Store unified user info
            unifiedUserMap.set(eitjeUserId, {
              id: user._id,
              name: fullName || user.name || '',
              borkId: borkMapping?.externalId || undefined,
            });
          }
        }
      }
    });

    console.log(`[Worker Profiles Aggregation] Unified user maps built: ${userNameMap.size} users from unified_users`);
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

    // ✅ DUPLICATE DETECTION: Check for duplicate eitje_user_id entries
    console.log('[Worker Profiles Aggregation] Checking for duplicate worker profiles...');
    const eitjeIdCounts = new Map<number, number>();
    const duplicateProfiles: Array<{ eitjeUserId: number; profileIds: string[] }> = [];
    
    workerProfiles.forEach((profile: any) => {
      const eitjeId = profile.eitje_user_id;
      if (eitjeId) {
        const count = (eitjeIdCounts.get(eitjeId) || 0) + 1;
        eitjeIdCounts.set(eitjeId, count);
      }
    });
    
    // Find duplicates
    eitjeIdCounts.forEach((count, eitjeId) => {
      if (count > 1) {
        const profileIds = workerProfiles
          .filter((p: any) => p.eitje_user_id === eitjeId)
          .map((p: any) => p._id.toString());
        duplicateProfiles.push({ eitjeUserId: eitjeId, profileIds });
      }
    });
    
    if (duplicateProfiles.length > 0) {
      console.warn(`[Worker Profiles Aggregation] ⚠️  Found ${duplicateProfiles.length} duplicate eitje_user_id entries:`);
      duplicateProfiles.forEach((dup) => {
        console.warn(`[Worker Profiles Aggregation]   - eitje_user_id ${dup.eitjeUserId}: ${dup.profileIds.length} profiles (IDs: ${dup.profileIds.join(', ')})`);
      });
      console.warn(`[Worker Profiles Aggregation] ⚠️  Using first profile for each duplicate eitje_user_id`);
    } else {
      console.log('[Worker Profiles Aggregation] ✅ No duplicate eitje_user_id entries found');
    }
    
    // ✅ DEDUPLICATION: Filter to keep only first profile for each eitje_user_id
    const seenEitjeIds = new Set<number>();
    const uniqueProfiles = workerProfiles.filter((profile: any) => {
      const eitjeId = profile.eitje_user_id;
      if (!eitjeId) return true; // Keep profiles without eitje_user_id
      if (seenEitjeIds.has(eitjeId)) {
        console.warn(`[Worker Profiles Aggregation] ⚠️  Skipping duplicate profile ${profile._id} (eitje_user_id: ${eitjeId})`);
        return false;
      }
      seenEitjeIds.add(eitjeId);
      return true;
    });
    
    if (uniqueProfiles.length < workerProfiles.length) {
      console.log(`[Worker Profiles Aggregation] Deduplicated: ${workerProfiles.length} → ${uniqueProfiles.length} unique profiles`);
    }

    // Aggregate each worker
    let processed = 0;
    let errors = 0;
    const bulkOps: any[] = [];

    for (const profile of uniqueProfiles) {
      try {
        const locationId = profile.location_id;
        const locationName = locationId ? locationMap.get(typeof locationId === 'string' ? locationId : locationId.toString()) : undefined;
        
        // ✅ Fetch unified user info from maps
        const unifiedUserInfo = unifiedUserMap.get(profile.eitje_user_id);
        const userName = userNameMap.get(profile.eitje_user_id) || null;
        const unifiedUserId = unifiedUserInfo?.id || null;
        const unifiedUserName = unifiedUserInfo?.name || userName || null;
        const borkUserId = unifiedUserInfo?.borkId || null;
        const borkUserName = unifiedUserName; // Usually same as unifiedUserName
        
        if (!userName) {
          console.warn(`[Worker Profiles Aggregation] ⚠️  No user name found for eitje_user_id ${profile.eitje_user_id}`);
        }
        if (!unifiedUserId) {
          console.warn(`[Worker Profiles Aggregation] ⚠️  No unified user found for eitje_user_id ${profile.eitje_user_id}`);
        }

        const aggregated = await buildWorkerAggregated(
          profile, 
          locationName, 
          userName,
          unifiedUserId,
          unifiedUserName,
          borkUserId,
          borkUserName
        );

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

          // ✅ Better progress logging - every 10 workers (more frequent updates)
          if (processed % 10 === 0) {
            const progress = ((processed / uniqueProfiles.length) * 100).toFixed(1);
            console.log(`[Worker Profiles Aggregation] Progress: ${processed}/${uniqueProfiles.length} (${progress}%) - ${errors} errors`);
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

      const result = await db.collection(V2_COLLECTIONS.WORKER_PROFILES_AGGREGATED)
        .bulkWrite(bulkOps);

      console.log(`[Worker Profiles Aggregation] ✅ Bulk write complete:`, {
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      });
    }

    // Verify aggregation
    const aggregatedCount = await db.collection(V2_COLLECTIONS.WORKER_PROFILES_AGGREGATED)
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
