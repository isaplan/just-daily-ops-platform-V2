/**
 * GET /api/admin/check-environments
 * 
 * Check unique environments/locations from Eitje raw data
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    // Get unique environments from raw data
    const environments = await db.collection('eitje_raw_data').aggregate([
      {
        $group: {
          _id: {
            environmentId: '$environmentId',
            environmentName: '$extracted.environmentName',
          },
          count: { $sum: 1 },
          firstSeen: { $min: '$date' },
          lastSeen: { $max: '$date' },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    // Also check raw API response for environment info
    const sampleWithEnvironment = await db.collection('eitje_raw_data')
      .find({ 'rawApiResponse.environment': { $exists: true } })
      .limit(10)
      .toArray();

    const environmentDetails = sampleWithEnvironment.map((record) => ({
      environmentId: record.rawApiResponse?.environment?.id,
      environmentName: record.rawApiResponse?.environment?.name,
      extractedEnvironmentId: record.extracted?.environmentId,
      extractedEnvironmentName: record.extracted?.environmentName,
    }));

    return NextResponse.json({
      success: true,
      data: {
        uniqueEnvironments: environments.map((env) => ({
          environmentId: env._id.environmentId,
          environmentName: env._id.environmentName,
          recordCount: env.count,
          firstSeen: env.firstSeen ? new Date(env.firstSeen).toISOString().split('T')[0] : null,
          lastSeen: env.lastSeen ? new Date(env.lastSeen).toISOString().split('T')[0] : null,
        })),
        sampleDetails: environmentDetails,
      },
    });
  } catch (error: any) {
    console.error('[API /admin/check-environments] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check environments',
      },
      { status: 500 }
    );
  }
}






