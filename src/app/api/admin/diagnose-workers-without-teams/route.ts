/**
 * GET /api/admin/diagnose-workers-without-teams
 * Shows which workers have no team data and why
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Get all worker profiles
    const allProfiles = await db.collection('worker_profiles')
      .find({})
      .sort({ eitje_user_id: 1 })
      .toArray();
    
    // Separate workers with and without teams
    const workersWithTeams = allProfiles.filter(w => w.teams && w.teams.length > 0);
    const workersWithoutTeams = allProfiles.filter(w => !w.teams || w.teams.length === 0);
    
    console.log(`Total workers: ${allProfiles.length}`);
    console.log(`Workers WITH teams: ${workersWithTeams.length}`);
    console.log(`Workers WITHOUT teams: ${workersWithoutTeams.length}`);
    
    // For workers without teams, check if they have ANY shifts
    const workersWithoutTeamsDetails = [];
    
    for (const worker of workersWithoutTeams.slice(0, 20)) { // Limit to first 20 for performance
      const userId = worker.eitje_user_id;
      
      // Check for shifts
      const shiftsCount = await db.collection('eitje_raw_data').countDocuments({
        endpoint: 'time_registration_shifts',
        $or: [
          { 'extracted.user_id': userId },
          { 'extracted.userId': userId },
          { 'rawApiResponse.user_id': userId },
          { 'rawApiResponse.userId': userId }
        ]
      });
      
      // Sample one shift if exists
      let sampleShift = null;
      if (shiftsCount > 0) {
        sampleShift = await db.collection('eitje_raw_data').findOne({
          endpoint: 'time_registration_shifts',
          $or: [
            { 'extracted.user_id': userId },
            { 'extracted.userId': userId },
            { 'rawApiResponse.user_id': userId },
            { 'rawApiResponse.userId': userId }
          ]
        });
      }
      
      workersWithoutTeamsDetails.push({
        eitje_user_id: userId,
        user_name: worker.user_name || 'Unknown',
        location_name: worker.location_name || 'Unknown',
        shiftsCount,
        hasShifts: shiftsCount > 0,
        sampleShift: sampleShift ? {
          date: sampleShift.date || sampleShift.extracted?.date,
          team_id: sampleShift.extracted?.team_id || sampleShift.rawApiResponse?.team_id,
          team_name: sampleShift.extracted?.team_name || sampleShift.rawApiResponse?.team_name,
        } : null
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalWorkers: allProfiles.length,
          workersWithTeams: workersWithTeams.length,
          workersWithoutTeams: workersWithoutTeams.length,
          percentageWithTeams: ((workersWithTeams.length / allProfiles.length) * 100).toFixed(1) + '%'
        },
        workersWithoutTeamsDetails: workersWithoutTeamsDetails,
        analysis: {
          workersWithShiftsButNoTeams: workersWithoutTeamsDetails.filter(w => w.hasShifts).length,
          workersWithNoShiftsAtAll: workersWithoutTeamsDetails.filter(w => !w.hasShifts).length,
        }
      }
    });
    
  } catch (error: any) {
    console.error('[Diagnose Workers] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to diagnose workers',
      },
      { status: 500 }
    );
  }
}

