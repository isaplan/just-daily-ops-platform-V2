/**
 * GET /api/eitje/v2/unique-teams
 * Fetch unique team names from eitje_raw_data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // Get unique team names from eitje_raw_data
    const uniqueTeams = await db.collection('eitje_raw_data').aggregate([
      {
        $match: {
          endpoint: 'time_registration_shifts',
        },
      },
      {
        $project: {
          teamName: {
            $ifNull: [
              '$extracted.team_name', // Primary field (most common)
              {
                $ifNull: [
                  '$extracted.teamName',
                  {
                    $ifNull: [
                      '$rawApiResponse.team_name',
                      '$rawApiResponse.teamName',
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $match: {
          teamName: { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: '$teamName',
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]).toArray();

    const teamNames = uniqueTeams
      .map((team) => team._id)
      .filter((name) => name && typeof name === 'string')
      .sort();

    return NextResponse.json({
      success: true,
      teams: teamNames,
    });
  } catch (error: any) {
    console.error('[API /eitje/v2/unique-teams] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch unique teams',
      },
      { status: 500 }
    );
  }
}

