/**
 * POST /api/admin/aggregate-worker-teams
 * Aggregates team data from shifts and updates worker_profiles
 * This should be run periodically to keep worker team data up-to-date
 * 
 * STRATEGY: Use shifts as the SOURCE OF TRUTH
 * Every worker who has worked shifts MUST have team data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    console.log('[Aggregate Worker Teams] Starting aggregation from SHIFTS (source of truth)...');
    
    // Step 1: Get all teams from eitje_raw_data (master data)
    const eitjeTeams = await db.collection('eitje_raw_data')
      .find({ endpoint: 'teams' })
      .toArray();
    
    const teamLookup = new Map();
    eitjeTeams.forEach(team => {
      const teamData = team.extracted || team.rawApiResponse || {};
      const teamId = teamData.id || teamData.team_id;
      const teamName = teamData.name || teamData.team_name;
      if (teamId && teamName) {
        const numericId = typeof teamId === 'number' ? teamId : parseInt(String(teamId), 10);
        teamLookup.set(numericId, {
          team_id: String(numericId),
          team_name: teamName,
          team_type: teamData.team_type || null,
        });
        // Also store by string key for flexible lookup
        teamLookup.set(String(numericId), {
          team_id: String(numericId),
          team_name: teamName,
          team_type: teamData.team_type || null,
        });
      }
    });
    
    console.log(`[Aggregate Worker Teams] Loaded ${eitjeTeams.length} teams, ${teamLookup.size / 2} unique IDs`);
    
    // Step 2: Get ALL shifts with user and team data
    console.log('[Aggregate Worker Teams] Querying ALL shifts...');
    const allShifts = await db.collection('eitje_raw_data')
      .find({ endpoint: 'time_registration_shifts' })
      .toArray();
    
    console.log(`[Aggregate Worker Teams] Found ${allShifts.length} total shifts`);
    
    // Step 3: Extract user-team relationships from shifts
    const userTeamsMap = new Map<number, Map<string, any>>();
    let shiftsProcessed = 0;
    let shiftsWithUserAndTeam = 0;
    let shiftsWithoutUser = 0;
    let shiftsWithoutTeam = 0;
    
    allShifts.forEach(shift => {
      shiftsProcessed++;
      
      const extracted = shift.extracted || {};
      const raw = shift.rawApiResponse || {};
      
      // Try all possible field names for user_id
      const userId = extracted.user_id || extracted.userId || raw.user_id || raw.userId;
      
      // Try all possible field names for team_id and team_name
      const teamId = extracted.team_id || extracted.teamId || raw.team_id || raw.teamId;
      const teamName = extracted.team_name || extracted.teamName || raw.team_name || raw.teamName;
      const shiftDate = shift.date || shift.extracted?.date || shift.rawApiResponse?.date;
      
      if (!userId) {
        shiftsWithoutUser++;
        return;
      }
      
      if (!teamId && !teamName) {
        shiftsWithoutTeam++;
        return;
      }
      
      shiftsWithUserAndTeam++;
      
      // Initialize user's team map if needed
      if (!userTeamsMap.has(userId)) {
        userTeamsMap.set(userId, new Map());
      }
      
      const normalizedTeamId = teamId ? 
        (typeof teamId === 'number' ? String(teamId) : String(teamId)) : 
        `unknown_${teamName}`;
      
      const userTeams = userTeamsMap.get(userId)!;
      
      // Update or create team entry for this user
      if (!userTeams.has(normalizedTeamId)) {
        const teamInfo = teamLookup.get(normalizedTeamId) || 
                        teamLookup.get(parseInt(normalizedTeamId, 10)) || 
                        {
                          team_id: normalizedTeamId,
                          team_name: teamName || 'Unknown Team',
                          team_type: null,
                        };
        
        userTeams.set(normalizedTeamId, {
          ...teamInfo,
          first_shift: shiftDate,
          last_shift: shiftDate,
          shift_count: 1
        });
      } else {
        const teamEntry = userTeams.get(normalizedTeamId)!;
        teamEntry.shift_count++;
        if (shiftDate && (!teamEntry.last_shift || shiftDate > teamEntry.last_shift)) {
          teamEntry.last_shift = shiftDate;
        }
        if (shiftDate && (!teamEntry.first_shift || shiftDate < teamEntry.first_shift)) {
          teamEntry.first_shift = shiftDate;
        }
      }
    });
    
    console.log(`[Aggregate Worker Teams] Shift Analysis:`);
    console.log(`  - Total shifts processed: ${shiftsProcessed}`);
    console.log(`  - Shifts with user AND team: ${shiftsWithUserAndTeam}`);
    console.log(`  - Shifts without user: ${shiftsWithoutUser}`);
    console.log(`  - Shifts without team: ${shiftsWithoutTeam}`);
    console.log(`  - Unique workers found: ${userTeamsMap.size}`);
    
    // Step 4: Convert to array format and determine active status
    const userTeamsArray = new Map<number, any[]>();
    
    userTeamsMap.forEach((teams, userId) => {
      const teamsArray = Array.from(teams.values()).map(team => {
        // Determine if active (last shift within 90 days)
        const daysSinceLastShift = team.last_shift ? 
          (Date.now() - new Date(team.last_shift).getTime()) / (1000 * 60 * 60 * 24) : 999;
        const isActive = daysSinceLastShift <= 90;
        
        return {
          team_id: team.team_id,
          team_name: team.team_name,
          team_type: team.team_type,
          is_active: isActive,
          shift_count: team.shift_count,
          first_shift: team.first_shift,
          last_shift: team.last_shift,
        };
      });
      
      // Sort by last shift date (most recent first)
      teamsArray.sort((a, b) => {
        if (!a.last_shift) return 1;
        if (!b.last_shift) return -1;
        return new Date(b.last_shift).getTime() - new Date(a.last_shift).getTime();
      });
      
      userTeamsArray.set(userId, teamsArray);
    });
    
    console.log(`[Aggregate Worker Teams] Built team data for ${userTeamsArray.size} workers`);
    
    // Sample some data for debugging
    const sampleUsers = Array.from(userTeamsArray.entries()).slice(0, 3);
    sampleUsers.forEach(([userId, teams]) => {
      console.log(`  Worker ${userId}: ${teams.length} teams, most recent: ${teams[0]?.team_name} (${teams[0]?.shift_count} shifts)`);
    });
    
    // Step 5: Update ALL worker profiles with team data
    const bulkOps = [];
    let workersWithTeams = 0;
    let workersWithoutTeams = 0;
    
    // Get all worker profiles
    const workerProfiles = await db.collection('worker_profiles').find({}).toArray();
    console.log(`[Aggregate Worker Teams] Updating ${workerProfiles.length} worker profiles...`);
    
    for (const profile of workerProfiles) {
      const userId = profile.eitje_user_id;
      const teams = userTeamsArray.get(userId) || [];
      
      if (teams.length > 0) {
        workersWithTeams++;
      } else {
        workersWithoutTeams++;
        console.log(`  ⚠️  Worker ${userId} (${profile.user_name}) has NO teams from ${allShifts.length} shifts!`);
      }
      
      bulkOps.push({
        updateOne: {
          filter: { _id: profile._id },
          update: {
            $set: {
              teams: teams,
              teams_updated_at: new Date()
            }
          }
        }
      });
    }
    
    // Execute bulk update
    let bulkResult = null;
    if (bulkOps.length > 0) {
      bulkResult = await db.collection('worker_profiles').bulkWrite(bulkOps);
      console.log(`[Aggregate Worker Teams] Bulk update result:`, {
        matched: bulkResult.matchedCount,
        modified: bulkResult.modifiedCount
      });
    }
    
    console.log(`[Aggregate Worker Teams] ✅ Completed!`);
    console.log(`  - Workers WITH teams: ${workersWithTeams}`);
    console.log(`  - Workers WITHOUT teams: ${workersWithoutTeams}`);
    console.log(`  - Total shifts analyzed: ${allShifts.length}`);
    console.log(`  - Total unique workers in shifts: ${userTeamsArray.size}`);
    
    return NextResponse.json({
      success: true,
      data: {
        totalShifts: allShifts.length,
        shiftsWithUserAndTeam,
        shiftsWithoutUser,
        shiftsWithoutTeam,
        uniqueWorkersInShifts: userTeamsArray.size,
        workerProfilesUpdated: bulkResult?.modifiedCount || 0,
        workersWithTeams,
        workersWithoutTeams,
        totalTeams: eitjeTeams.length,
      },
      message: workersWithoutTeams > 0 ? 
        `⚠️ ${workersWithoutTeams} workers have NO team data despite ${allShifts.length} shifts in database` :
        `✅ All ${workersWithTeams} workers have team data from ${allShifts.length} shifts`
    });
    
  } catch (error: any) {
    console.error('[Aggregate Worker Teams] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to aggregate worker teams',
      },
      { status: 500 }
    );
  }
}

