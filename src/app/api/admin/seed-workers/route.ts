/**
 * POST /api/admin/seed-workers
 * 
 * Creates worker profiles from existing Eitje users
 * Adds default hourly wages so labor costs can be calculated
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function POST() {
  try {
    const db = await getDatabase();

    // Get all unique users from eitje_raw_data
    const users = await db.collection('eitje_raw_data').aggregate([
      {
        $match: {
          endpoint: 'users',
        },
      },
      {
        $group: {
          _id: '$extracted.id',
          firstName: { $first: '$extracted.first_name' },
          lastName: { $first: '$extracted.last_name' },
          email: { $first: '$extracted.email' },
          sampleRecord: { $first: '$$ROOT' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    if (users.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No users found in eitje_raw_data. Please sync Eitje users first.',
      });
    }

    // Get active locations
    const locations = await db.collection('locations').find({ isActive: true }).toArray();
    const defaultLocation = locations[0]; // Use first location as default

    // Check existing worker profiles
    const existingProfiles = await db.collection('worker_profiles').find({}).toArray();
    const existingUserIds = new Set(existingProfiles.map((p) => p.eitje_user_id));

    // Get valid location IDs from locations collection
    const validLocationIds = new Set(locations.map(loc => loc._id?.toString()).filter(Boolean));

    // Define default hourly wages by role (you can customize these)
    const defaultHourlyWages: Record<string, number> = {
      manager: 18.50,
      supervisor: 16.00,
      bartender: 13.50,
      server: 12.50,
      kitchen: 14.00,
      default: 13.27, // Dutch minimum wage 2025
    };

    const workersToCreate = [];
    const workersToUpdate = [];
    const now = new Date();

    for (const user of users) {
      const eitjeUserId = user._id;
      
      if (!eitjeUserId) {
        continue; // Skip if no ID
      }

      // Check if worker exists and has invalid location_id
      const existingWorker = existingProfiles.find(p => p.eitje_user_id === eitjeUserId);
      if (existingWorker) {
        // Update if location_id is invalid
        if (!existingWorker.location_id || !validLocationIds.has(existingWorker.location_id)) {
          workersToUpdate.push({
            _id: existingWorker._id,
            location_id: defaultLocation?._id?.toString() || null,
          });
        }
        continue; // Skip creating new profile
      }

      // Determine hourly wage based on role or use default
      const role = user.sampleRecord?.extracted?.role?.toLowerCase() || 'default';
      const hourlyWage = defaultHourlyWages[role] || defaultHourlyWages.default;

      const workerProfile = {
        eitje_user_id: eitjeUserId,
        location_id: defaultLocation?._id?.toString() || null,
        contract_type: 'Flexible', // Default contract type
        contract_hours: null, // Can be set later
        hourly_wage: hourlyWage,
        wage_override: false,
        effective_from: new Date('2025-01-01'), // Start of 2025
        effective_to: null, // Active indefinitely
        notes: 'Auto-created from Eitje users',
        created_at: now,
        updated_at: now,
      };

      workersToCreate.push(workerProfile);
    }

    // Bulk update workers with invalid location_id
    let updatedCount = 0;
    if (workersToUpdate.length > 0) {
      for (const worker of workersToUpdate) {
        await db.collection('worker_profiles').updateOne(
          { _id: worker._id },
          {
            $set: {
              location_id: worker.location_id,
              updated_at: now,
            },
          }
        );
        updatedCount++;
      }
    }

    // Insert new worker profiles
    let insertedCount = 0;
    if (workersToCreate.length > 0) {
      const result = await db.collection('worker_profiles').insertMany(workersToCreate);
      insertedCount = result.insertedCount;
    }

    if (workersToCreate.length === 0 && workersToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All users already have valid worker profiles',
        created: 0,
        updated: 0,
        totalUsers: users.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Created ${insertedCount} worker profiles, updated ${updatedCount} with correct location_id`,
      created: insertedCount,
      updated: updatedCount,
      totalUsers: users.length,
      existingProfiles: existingUserIds.size,
      workers: workersToCreate.map((w) => ({
        eitjeUserId: w.eitje_user_id,
        hourlyWage: w.hourly_wage,
        contractType: w.contract_type,
      })),
    });
  } catch (error: any) {
    console.error('[API /admin/seed-workers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to seed workers',
      },
      { status: 500 }
    );
  }
}


