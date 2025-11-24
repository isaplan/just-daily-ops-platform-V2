/**
 * POST /api/admin/map-eitje-to-locations
 * 
 * Map existing Eitje data to correct locations based on environmentId
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function POST() {
  try {
    const db = await getDatabase();

    // Get all locations
    const locations = await db.collection('locations').find({}).toArray();
    
    // Create mapping: environmentId -> locationId
    const envToLocationMap = new Map<number, ObjectId>();
    
    for (const loc of locations) {
      // Check if location has systemMappings with Eitje environmentId
      if (loc.systemMappings && Array.isArray(loc.systemMappings)) {
        const eitjeMapping = loc.systemMappings.find((m: any) => m.system === 'eitje');
        if (eitjeMapping) {
          envToLocationMap.set(Number(eitjeMapping.externalId), loc._id);
        }
      }
    }

    // Also create mapping by name (fallback)
    const nameToLocationMap = new Map<string, ObjectId>();
    nameToLocationMap.set('Van Kinsbergen', locations.find(l => l.name === 'Van Kinsbergen')?._id!);
    nameToLocationMap.set('l\'Amour Toujours', locations.find(l => l.name === 'l\'Amour Toujours')?._id!);
    nameToLocationMap.set('Bar Bea', locations.find(l => l.name === 'Bar Bea')?._id!);

    // Get unique environments from raw data with their names
    const environments = await db.collection('eitje_raw_data').aggregate([
      {
        $group: {
          _id: '$environmentId',
          sampleRecord: { $first: '$$ROOT' },
        },
      },
    ]).toArray();

    // Build environmentId -> locationId mapping
    const envMapping = new Map<number, ObjectId>();
    for (const env of environments) {
      const envId = env._id;
      const envName = env.sampleRecord.rawApiResponse?.environment?.name || 
                     env.sampleRecord.extracted?.environmentName;
      
      // Try to find location by environmentId first
      let locationId = envToLocationMap.get(envId);
      
      // Fallback to name mapping
      if (!locationId && envName) {
        locationId = nameToLocationMap.get(envName);
      }
      
      if (locationId) {
        envMapping.set(envId, locationId);
      }
    }

    if (envMapping.size === 0) {
      return NextResponse.json({
        success: false,
        error: 'No environment to location mapping found',
      });
    }

    // Update raw data
    let rawUpdated = 0;
    for (const [envId, locationId] of envMapping.entries()) {
      const result = await db.collection('eitje_raw_data').updateMany(
        { environmentId: envId },
        { $set: { locationId: locationId } }
      );
      rawUpdated += result.modifiedCount;
    }

    // Re-aggregate all data (delete old aggregated and let it be recreated)
    const deletedAggregated = await db.collection('eitje_aggregated').deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Mapped Eitje data to locations',
      data: {
        environmentsMapped: envMapping.size,
        rawRecordsUpdated: rawUpdated,
        aggregatedRecordsDeleted: deletedAggregated.deletedCount,
        mapping: Array.from(envMapping.entries()).map(([envId, locId]) => ({
          environmentId: envId,
          locationId: locId.toString(),
        })),
      },
    });
  } catch (error: any) {
    console.error('[API /admin/map-eitje-to-locations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to map Eitje data to locations',
      },
      { status: 500 }
    );
  }
}











