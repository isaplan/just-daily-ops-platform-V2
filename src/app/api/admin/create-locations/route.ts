/**
 * POST /api/admin/create-locations
 * 
 * Create locations from Eitje environments
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function POST() {
  try {
    const db = await getDatabase();

    // Get unique environments from raw data
    const environments = await db.collection('eitje_raw_data').aggregate([
      {
        $group: {
          _id: '$environmentId',
          sampleRecord: { $first: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    const locationsToCreate = environments.map((env) => {
      const envName = env.sampleRecord.rawApiResponse?.environment?.name || 
                     env.sampleRecord.extracted?.environmentName ||
                     `Environment ${env._id}`;
      
      // Map environment names to location codes
      const codeMap: Record<string, string> = {
        'Van Kinsbergen': 'VK',
        'l\'Amour Toujours': 'LAT',
        'Bar Bea': 'BB',
      };

      return {
        name: envName,
        code: codeMap[envName] || envName.substring(0, 3).toUpperCase(),
        city: 'Den Haag', // Default city
        country: 'Netherlands',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Store Eitje environment ID for mapping
        systemMappings: [{
          system: 'eitje',
          externalId: env._id.toString(),
        }],
      };
    });

    // Check which locations already exist
    const existingLocations = await db.collection('locations').find({}).toArray();
    const existingNames = new Set(existingLocations.map((loc) => loc.name));

    const newLocations = locationsToCreate.filter((loc) => !existingNames.has(loc.name));

    if (newLocations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All locations already exist',
        data: {
          existing: existingLocations.length,
          created: 0,
        },
      });
    }

    // Insert new locations
    const result = await db.collection('locations').insertMany(newLocations);

    // Get all locations (including newly created)
    const allLocations = await db.collection('locations').find({}).toArray();

    return NextResponse.json({
      success: true,
      message: `Created ${newLocations.length} new locations`,
      data: {
        created: newLocations.length,
        existing: existingLocations.length,
        total: allLocations.length,
        locations: allLocations.map((loc) => ({
          id: loc._id.toString(),
          name: loc.name,
          code: loc.code,
          isActive: loc.isActive,
        })),
      },
    });
  } catch (error: any) {
    console.error('[API /admin/create-locations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create locations',
      },
      { status: 500 }
    );
  }
}






