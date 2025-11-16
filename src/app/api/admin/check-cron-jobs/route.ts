/**
 * GET /api/admin/check-cron-jobs
 * 
 * Check cron job status and last run times from MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();

    // Get all cron jobs
    const cronJobs = await db.collection('cron_jobs').find({}).toArray();

    // Format the response
    const formattedJobs = cronJobs.map((job: any) => ({
      jobType: job.jobType,
      isActive: job.isActive,
      schedule: job.schedule,
      syncInterval: job.syncInterval,
      enabledEndpoints: job.enabledEndpoints,
      enabledMasterEndpoints: job.enabledMasterEndpoints,
      quietHours: job.quietHours,
      lastRun: job.lastRun ? new Date(job.lastRun).toISOString() : null,
      nextRun: job.nextRun ? new Date(job.nextRun).toISOString() : null,
      createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
      updatedAt: job.updatedAt ? new Date(job.updatedAt).toISOString() : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        count: cronJobs.length,
        jobs: formattedJobs,
      },
    });
  } catch (error: any) {
    console.error('[API /admin/check-cron-jobs] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check cron jobs',
      },
      { status: 500 }
    );
  }
}


