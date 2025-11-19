/**
 * GET /api/admin/get-all-environments
 * 
 * Get all unique environments with their names from raw data
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get one sample record for each environment to get the name
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

    const environmentDetails = environments.map((env) => ({
      environmentId: env._id,
      environmentName: env.sampleRecord.rawApiResponse?.environment?.name || 
                      env.sampleRecord.extracted?.environmentName ||
                      `Environment ${env._id}`,
      recordCount: env.count,
      firstDate: env.sampleRecord.date ? new Date(env.sampleRecord.date).toISOString().split('T')[0] : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        count: environmentDetails.length,
        environments: environmentDetails,
      },
    });
  } catch (error: any) {
    console.error('[API /admin/get-all-environments] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get environments',
      },
      { status: 500 }
    );
  }
}








