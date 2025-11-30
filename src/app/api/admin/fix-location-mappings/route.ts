/**
 * POST /api/admin/fix-location-mappings
 * 
 * Fix location system mapping integrity issues
 * Removes incorrect mappings based on rawData.Name matching location.name
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function POST() {
  try {
    const db = await getDatabase();

    // Get all locations
    const locations = await db.collection('locations').find({}).toArray();

    const fixes: any[] = [];
    const errors: any[] = [];

    for (const loc of locations) {
      if (!loc.systemMappings || !Array.isArray(loc.systemMappings)) {
        continue;
      }

      // Check each mapping for name mismatches
      const correctMappings: any[] = [];
      const removedMappings: any[] = [];

      for (const mapping of loc.systemMappings) {
        let shouldKeep = true;

        // Check Bork mappings with rawData
        if (mapping.system === 'bork' && mapping.rawData) {
          if (mapping.rawData.Name) {
            // Case-insensitive comparison (normalize both to lowercase for comparison)
            const rawDataNameNormalized = mapping.rawData.Name.trim().toLowerCase();
            const locationNameNormalized = loc.name.trim().toLowerCase();
            
            // If rawData.Name doesn't match location.name (case-insensitive), remove this mapping
            if (rawDataNameNormalized !== locationNameNormalized) {
              shouldKeep = false;
              removedMappings.push({
                system: mapping.system,
                externalId: mapping.externalId,
                reason: `rawData.Name="${mapping.rawData.Name}" doesn't match location.name="${loc.name}" (case-insensitive comparison)`,
              });
            }
          }
        }

        if (shouldKeep) {
          correctMappings.push(mapping);
        }
      }

      // If mappings were removed, update the location
      if (removedMappings.length > 0) {
        try {
          await db.collection('locations').updateOne(
            { _id: loc._id },
            {
              $set: {
                systemMappings: correctMappings,
                updatedAt: new Date(),
              },
            }
          );

          fixes.push({
            locationId: loc._id,
            locationName: loc.name,
            removedMappings,
            remainingMappings: correctMappings.length,
          });
        } catch (error: any) {
          errors.push({
            locationId: loc._id,
            locationName: loc.name,
            error: error.message,
          });
        }
      }
    }

    // Also check for duplicate externalIds and resolve them
    // Find all locations with the problematic externalId
    const problematicExternalId = '7700876361729';
    const locationsWithDuplicate = locations.filter((loc) => {
      if (!loc.systemMappings) return false;
      return loc.systemMappings.some(
        (m: any) => m.system === 'bork' && m.externalId === problematicExternalId
      );
    });

    // Determine which location should keep it (based on rawData.Name matching location.name, case-insensitive)
    let correctLocation: any = null;
    for (const loc of locationsWithDuplicate) {
      if (!loc.systemMappings) continue;
      const mapping = loc.systemMappings.find(
        (m: any) => m.system === 'bork' && m.externalId === problematicExternalId
      );
      if (mapping?.rawData?.Name) {
        const rawDataNameNormalized = mapping.rawData.Name.trim().toLowerCase();
        const locationNameNormalized = loc.name.trim().toLowerCase();
        if (rawDataNameNormalized === locationNameNormalized) {
          correctLocation = loc;
          break;
        }
      }
    }

    // If we found the correct location, remove the mapping from others
    if (correctLocation) {
      for (const loc of locationsWithDuplicate) {
        if (loc._id.toString() === correctLocation._id.toString()) {
          continue; // Skip the correct location
        }

        // Remove the duplicate mapping from this location
        const updatedMappings = loc.systemMappings.filter(
          (m: any) => !(m.system === 'bork' && m.externalId === problematicExternalId)
        );

        try {
          await db.collection('locations').updateOne(
            { _id: loc._id },
            {
              $set: {
                systemMappings: updatedMappings,
                updatedAt: new Date(),
              },
            }
          );

          fixes.push({
            locationId: loc._id,
            locationName: loc.name,
            removedMappings: [
              {
                system: 'bork',
                externalId: problematicExternalId,
                reason: `Duplicate externalId - belongs to "${correctLocation.name}"`,
              },
            ],
            remainingMappings: updatedMappings.length,
          });
        } catch (error: any) {
          errors.push({
            locationId: loc._id,
            locationName: loc.name,
            error: error.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        locationsFixed: fixes.length,
        totalFixes: fixes.reduce((sum, f) => sum + f.removedMappings.length, 0),
        errors: errors.length,
      },
      fixes,
      errors: errors.length > 0 ? errors : null,
    });
  } catch (error: any) {
    console.error('[Fix Location Mappings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fix location mappings',
      },
      { status: 500 }
    );
  }
}

