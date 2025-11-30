/**
 * GET /api/admin/investigate-locations
 * 
 * Investigate locations collection for data integrity issues
 * Specifically checks for incorrect system mappings
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get all locations
    const locations = await db.collection('locations').find({}).toArray();

    // Analyze each location
    const analysis = locations.map((loc) => {
      const issues: string[] = [];
      const mappings: any[] = [];

      // Check system mappings
      if (loc.systemMappings && Array.isArray(loc.systemMappings)) {
        for (const mapping of loc.systemMappings) {
          const mappingInfo: any = {
            system: mapping.system,
            externalId: mapping.externalId,
          };

          // Check for name mismatches in rawData
          if (mapping.rawData) {
            // Bork rawData structure
            if (mapping.rawData.Name) {
              mappingInfo.rawDataName = mapping.rawData.Name;
              if (mapping.rawData.Name !== loc.name) {
                issues.push(
                  `Bork mapping name mismatch: rawData.Name="${mapping.rawData.Name}" but location.name="${loc.name}"`
                );
              }
            }
            // Eitje rawData structure (if any)
            if (mapping.rawData.name && mapping.rawData.name !== loc.name) {
              issues.push(
                `Eitje mapping name mismatch: rawData.name="${mapping.rawData.name}" but location.name="${loc.name}"`
              );
            }
          }

          mappings.push(mappingInfo);
        }
      }

      // Check for duplicate external IDs across locations
      const duplicateCheck: any = {};
      if (loc.systemMappings) {
        for (const mapping of loc.systemMappings) {
          const key = `${mapping.system}:${mapping.externalId}`;
          duplicateCheck[key] = true;
        }
      }

      return {
        _id: loc._id,
        name: loc.name,
        code: loc.code,
        isActive: loc.isActive,
        systemMappings: mappings,
        issues: issues.length > 0 ? issues : null,
        createdAt: loc.createdAt,
        updatedAt: loc.updatedAt,
      };
    });

    // Find duplicate external IDs across different locations
    const externalIdMap = new Map<string, Array<{ locationId: any; locationName: string }>>();
    
    for (const loc of locations) {
      if (loc.systemMappings && Array.isArray(loc.systemMappings)) {
        for (const mapping of loc.systemMappings) {
          const key = `${mapping.system}:${mapping.externalId}`;
          if (!externalIdMap.has(key)) {
            externalIdMap.set(key, []);
          }
          externalIdMap.get(key)!.push({
            locationId: loc._id,
            locationName: loc.name,
          });
        }
      }
    }

    const duplicates: any[] = [];
    for (const [key, locations] of externalIdMap.entries()) {
      if (locations.length > 1) {
        duplicates.push({
          externalId: key,
          locations: locations,
        });
      }
    }

    // Summary
    const summary = {
      totalLocations: locations.length,
      locationsWithIssues: analysis.filter((a) => a.issues !== null).length,
      totalIssues: analysis.reduce((sum, a) => sum + (a.issues?.length || 0), 0),
      duplicateExternalIds: duplicates.length,
    };

    return NextResponse.json({
      success: true,
      summary,
      locations: analysis,
      duplicates: duplicates.length > 0 ? duplicates : null,
    });
  } catch (error: any) {
    console.error('[Investigate Locations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to investigate locations',
      },
      { status: 500 }
    );
  }
}




