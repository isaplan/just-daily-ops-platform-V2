/**
 * GET /api/admin/check-team-data
 * Diagnostic endpoint to check team data availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Check 1: Teams in eitje_raw_data
    const teamsCount = await db.collection('eitje_raw_data').countDocuments({ endpoint: 'teams' });
    const sampleTeam = await db.collection('eitje_raw_data').findOne({ endpoint: 'teams' });
    
    // Check 2: Shifts with team info
    const shiftsWithTeamsCount = await db.collection('eitje_raw_data').countDocuments({
      endpoint: 'time_registration_shifts',
      $or: [
        { 'extracted.team_id': { $exists: true, $ne: null } },
        { 'extracted.team_name': { $exists: true, $ne: null } },
        { 'rawApiResponse.team_id': { $exists: true, $ne: null } },
        { 'rawApiResponse.team_name': { $exists: true, $ne: null } }
      ]
    });
    
    const sampleShift = await db.collection('eitje_raw_data').findOne({
      endpoint: 'time_registration_shifts',
      'extracted.team_id': { $exists: true, $ne: null }
    });
    
    // Check 3: Worker profiles
    const workerProfilesCount = await db.collection('worker_profiles').countDocuments();
    
    // Check 4: Get unique teams from shifts
    const uniqueTeamsInShifts = await db.collection('eitje_raw_data').aggregate([
      {
        $match: {
          endpoint: 'time_registration_shifts',
          $or: [
            { 'extracted.team_name': { $exists: true, $ne: null } },
            { 'rawApiResponse.team_name': { $exists: true, $ne: null } }
          ]
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$extracted.team_name', '$rawApiResponse.team_name']
          }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    return NextResponse.json({
      success: true,
      data: {
        teams: {
          count: teamsCount,
          sample: sampleTeam ? {
            id: sampleTeam.extracted?.id || sampleTeam.rawApiResponse?.id,
            name: sampleTeam.extracted?.name || sampleTeam.rawApiResponse?.name,
            environment_id: sampleTeam.extracted?.environment_id || sampleTeam.rawApiResponse?.environment_id
          } : null,
          message: teamsCount === 0 
            ? '⚠️ No teams found! You need to sync Eitje teams data.' 
            : `✅ ${teamsCount} teams found in database`
        },
        shiftsWithTeams: {
          count: shiftsWithTeamsCount,
          sample: sampleShift ? {
            user_id: sampleShift.extracted?.user_id || sampleShift.rawApiResponse?.user_id,
            team_id: sampleShift.extracted?.team_id || sampleShift.rawApiResponse?.team_id,
            team_name: sampleShift.extracted?.team_name || sampleShift.rawApiResponse?.team_name,
            date: sampleShift.date
          } : null,
          message: shiftsWithTeamsCount === 0
            ? '⚠️ No shifts with team data found! Team assignments won\'t show for workers.'
            : `✅ ${shiftsWithTeamsCount} shifts with team data found`
        },
        uniqueTeamsInShifts: {
          count: uniqueTeamsInShifts.length,
          teams: uniqueTeamsInShifts.map(t => t._id),
          message: uniqueTeamsInShifts.length === 0
            ? '⚠️ No unique teams found in shifts'
            : `✅ ${uniqueTeamsInShifts.length} unique teams found in shifts`
        },
        workerProfiles: {
          count: workerProfilesCount,
          message: `${workerProfilesCount} worker profiles in database`
        },
        recommendations: [
          teamsCount === 0 ? '🔧 Run: POST /api/eitje/v2/sync with endpoint "teams" to sync team master data' : null,
          shiftsWithTeamsCount === 0 ? '🔧 Run: POST /api/eitje/v2/sync with endpoint "time_registration_shifts" to sync shift data with teams' : null,
          teamsCount > 0 && shiftsWithTeamsCount > 0 ? '✅ Team data looks good! Teams should show up in the UI now.' : null
        ].filter(Boolean)
      }
    });
    
  } catch (error: any) {
    console.error('[API /admin/check-team-data] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check team data',
      },
      { status: 500 }
    );
  }
}

