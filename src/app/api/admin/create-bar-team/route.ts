/**
 * POST /api/admin/create-bar-team
 * Creates the "Bar" team and assigns workers to it
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    console.log('[Create Bar Team] Starting...');
    
    // Step 1: Create or find "Bar" team in unified_teams
    const now = new Date();
    const barTeam = await db.collection('unified_teams').findOne({ name: 'Bar' });
    
    let barTeamId: ObjectId;
    if (barTeam) {
      console.log('[Create Bar Team] Bar team already exists, using existing team');
      barTeamId = barTeam._id!;
      
      // Update teamType if needed
      if (barTeam.teamType !== 'Beverage') {
        await db.collection('unified_teams').updateOne(
          { _id: barTeamId },
          { $set: { teamType: 'Beverage', updatedAt: now } }
        );
        console.log('[Create Bar Team] Updated teamType to "Beverage"');
      }
    } else {
      // Create new Bar team
      const result = await db.collection('unified_teams').insertOne({
        name: 'Bar',
        description: 'Bar team - part of Beverage division',
        teamType: 'Beverage',
        isActive: true,
        locationIds: [], // Will be populated based on worker locations
        memberIds: [], // Will be populated based on workers
        systemMappings: [],
        createdAt: now,
        updatedAt: now,
      });
      barTeamId = result.insertedId;
      console.log(`[Create Bar Team] Created new Bar team with ID: ${barTeamId}`);
    }
    
    // Step 2: Find all locations mentioned
    const locationNames = ['Kinsbergen', 'BarBea', "l'Amour Toujours"];
    const locations = await db.collection('locations')
      .find({ name: { $in: locationNames } })
      .toArray();
    
    const locationMap = new Map<string, ObjectId>();
    locations.forEach(loc => {
      if (loc.name && loc._id) {
        locationMap.set(loc.name, loc._id);
      }
    });
    
    console.log(`[Create Bar Team] Found ${locations.length} locations:`, Array.from(locationMap.keys()));
    
    // Step 3: Workers to assign (name -> location)
    const workersToAssign: Array<{ name: string; location: string }> = [
      { name: 'Joost Hansen', location: 'Kinsbergen' },
      { name: 'Alvinio Molina', location: 'BarBea' },
      { name: 'André Rozhok', location: 'Kinsbergen' },
      { name: 'Luuk de Brouwer', location: "l'Amour Toujours" },
      { name: 'Floris Heimgartner', location: 'BarBea' },
      { name: 'Scout Vos', location: 'BarBea' },
      { name: 'Bran van de Berg', location: 'Kinsbergen' },
      { name: 'Django den Heijer', location: 'Kinsbergen' },
      { name: 'Daniel Kaatee', location: 'BarBea' },
      { name: 'Vera van der Duin', location: 'BarBea' },
    ];
    
    // Step 4: Find workers and update their teams
    const updatedWorkers: string[] = [];
    const notFoundWorkers: string[] = [];
    const locationIdsForTeam: Set<string> = new Set();
    
    for (const { name, location } of workersToAssign) {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      const fullName = `${firstName} ${lastName}`;
      
      // Normalize name for case-insensitive search
      const nameLower = name.toLowerCase().trim();
      const firstNameLower = firstName.toLowerCase();
      const lastNameLower = lastName.toLowerCase();
      
      // Strategy 1: Search in worker_profiles by various name fields (case-insensitive)
      let worker = await db.collection('worker_profiles').findOne({
        $or: [
          { user_name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { userName: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { unifiedUserName: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          // Also try partial matches
          { user_name: { $regex: new RegExp(firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
          { userName: { $regex: new RegExp(firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } },
        ]
      });
      
      // Strategy 2: Search in unified_users by firstName/lastName, then find worker
      if (!worker) {
        const unifiedUser = await db.collection('unified_users').findOne({
          $or: [
            { 
              firstName: { $regex: new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              lastName: { $regex: new RegExp(`^${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            },
            // Try constructing name from firstName + lastName
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ['$firstName', ' ', '$lastName'] },
                  regex: new RegExp(`^${fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
                }
              }
            }
          ]
        });
        
        if (unifiedUser) {
          // Find worker profile by unified_user_id or eitje mapping
          const eitjeMapping = unifiedUser.systemMappings?.find((m: any) => m.system === 'eitje');
          if (eitjeMapping?.externalId) {
            worker = await db.collection('worker_profiles').findOne({
              eitje_user_id: Number(eitjeMapping.externalId)
            });
          }
          
          // Also try by unified_user_id if it's stored
          if (!worker && unifiedUser._id) {
            worker = await db.collection('worker_profiles').findOne({
              unified_user_id: unifiedUser._id
            });
          }
        }
      }
      
      // Strategy 3: Search in worker_profiles_aggregated (denormalized names)
      if (!worker) {
        worker = await db.collection('worker_profiles_aggregated').findOne({
          $or: [
            { userName: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { unifiedUserName: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          ]
        });
        
        // If found in aggregated, get the actual worker_profiles record
        if (worker && worker.eitjeUserId) {
          worker = await db.collection('worker_profiles').findOne({
            eitje_user_id: worker.eitjeUserId
          });
        }
      }
      
      // Strategy 4: Search in eitje_raw_data by name, then find worker
      if (!worker) {
        const eitjeUser = await db.collection('eitje_raw_data').findOne({
          endpoint: 'users',
          $or: [
            { 'extracted.first_name': { $regex: new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              'extracted.last_name': { $regex: new RegExp(`^${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { 'rawApiResponse.first_name': { $regex: new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              'rawApiResponse.last_name': { $regex: new RegExp(`^${lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          ]
        });
        
        if (eitjeUser) {
          const eitjeUserId = eitjeUser.extracted?.id || eitjeUser.rawApiResponse?.id;
          if (eitjeUserId) {
            worker = await db.collection('worker_profiles').findOne({
              eitje_user_id: Number(eitjeUserId)
            });
          }
        }
      }
      
      if (!worker) {
        console.log(`[Create Bar Team] ⚠️  Worker not found: ${name} (${location})`);
        notFoundWorkers.push(`${name} (${location})`);
        continue;
      }
      
      // Get location ID
      const locationId = locationMap.get(location);
      if (locationId) {
        locationIdsForTeam.add(locationId.toString());
      }
      
      // Prepare Bar team entry
      const barTeamEntry = {
        team_id: barTeamId.toString(),
        team_name: 'Bar',
        team_type: 'Beverage',
        is_active: true,
      };
      
      // Update worker's teams array
      const currentTeams = worker.teams || [];
      const hasBarTeam = currentTeams.some((t: any) => 
        t.team_name === 'Bar' || t.team_id === barTeamId.toString()
      );
      
      if (!hasBarTeam) {
        const updatedTeams = [...currentTeams, barTeamEntry];
        
        await db.collection('worker_profiles').updateOne(
          { _id: worker._id },
          {
            $set: {
              teams: updatedTeams,
              updated_at: now,
              updatedAt: now,
            }
          }
        );
        
        console.log(`[Create Bar Team] ✅ Added Bar team to: ${name} (${location})`);
        updatedWorkers.push(`${name} (${location})`);
      } else {
        console.log(`[Create Bar Team] ℹ️  ${name} already has Bar team`);
        updatedWorkers.push(`${name} (${location}) - already had team`);
      }
    }
    
    // Step 5: Update Bar team with locationIds and memberIds
    const locationIdsArray = Array.from(locationIdsForTeam).map(id => new ObjectId(id));
    
    // Get memberIds from updated workers
    const updatedWorkerProfiles = await db.collection('worker_profiles')
      .find({
        'teams.team_name': 'Bar'
      })
      .toArray();
    
    const memberIds: ObjectId[] = [];
    for (const worker of updatedWorkerProfiles) {
      if (worker.unified_user_id) {
        try {
          memberIds.push(new ObjectId(worker.unified_user_id));
        } catch (e) {
          // Skip invalid ObjectIds
        }
      }
    }
    
    await db.collection('unified_teams').updateOne(
      { _id: barTeamId },
      {
        $set: {
          locationIds: locationIdsArray,
          memberIds: memberIds,
          updatedAt: now,
        }
      }
    );
    
    console.log(`[Create Bar Team] ✅ Updated Bar team with ${locationIdsArray.length} locations and ${memberIds.length} members`);
    
    return NextResponse.json({
      success: true,
      data: {
        teamId: barTeamId.toString(),
        teamName: 'Bar',
        teamType: 'Beverage',
        updatedWorkers: updatedWorkers.length,
        notFoundWorkers: notFoundWorkers.length,
        workers: updatedWorkers,
        notFound: notFoundWorkers,
        locations: Array.from(locationIdsForTeam),
      },
      message: `✅ Created/updated Bar team. ${updatedWorkers.length} workers updated, ${notFoundWorkers.length} not found.`,
    });
  } catch (error: any) {
    console.error('[Create Bar Team] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create Bar team',
      },
      { status: 500 }
    );
  }
}

