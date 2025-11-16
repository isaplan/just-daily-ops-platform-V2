/**
 * POST /api/eitje/v2/cron
 * Manage Eitje cron jobs
 * 
 * Body:
 * - action: 'start' | 'stop' | 'update' | 'status'
 * - jobType: 'daily-data' | 'master-data' | 'historical-data'
 * - config?: CronJobConfig (for update action)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCronManager } from '@/lib/cron/v2-cron-manager';
import type { CronJobConfig } from '@/lib/cron/v2-cron-manager';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Support both POST body and query params (for Vercel cron jobs)
    const { searchParams } = new URL(request.url);
    const actionFromQuery = searchParams.get('action');
    const jobTypeFromQuery = searchParams.get('jobType');
    
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // If no body, use query params (Vercel cron calls)
      body = {};
    }
    
    const { action, jobType, config } = {
      action: actionFromQuery || body.action,
      jobType: jobTypeFromQuery || body.jobType,
      config: body.config,
    };

    if (!action || !jobType) {
      return NextResponse.json(
        { success: false, error: 'action and jobType are required' },
        { status: 400 }
      );
    }

    const cronManager = getCronManager();

    switch (action) {
      case 'start':
        await cronManager.startJob(jobType);
        return NextResponse.json({
          success: true,
          message: `${jobType} cron job started`,
        });

      case 'stop':
        await cronManager.stopJob(jobType);
        return NextResponse.json({
          success: true,
          message: `${jobType} cron job stopped`,
        });

      case 'update':
        if (!config) {
          return NextResponse.json(
            { success: false, error: 'config is required for update action' },
            { status: 400 }
          );
        }
        await cronManager.updateJob({ ...config, jobType });
        return NextResponse.json({
          success: true,
          message: `${jobType} cron job updated`,
        });

      case 'run-now':
        await cronManager.runJobNow(jobType);
        return NextResponse.json({
          success: true,
          message: `${jobType} cron job executed successfully`,
        });

      case 'status':
        const status = await cronManager.getJobStatus(jobType);
        return NextResponse.json({
          success: true,
          data: status,
        });

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[API /eitje/v2/cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to manage cron job',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get('jobType') as 'daily-data' | 'master-data' | 'historical-data' | null;
    const action = searchParams.get('action'); // For Vercel cron jobs

    // If action is 'run-now', execute the job (Vercel cron calls)
    if (action === 'run-now' && jobType) {
      const cronManager = getCronManager();
      await cronManager.runJobNow(jobType);
      return NextResponse.json({
        success: true,
        message: `${jobType} cron job executed successfully`,
      });
    }

    const cronManager = getCronManager();

    if (jobType) {
      const status = await cronManager.getJobStatus(jobType);
      
      // Return status if found, otherwise return null (job doesn't exist yet)
      if (!status) {
        return NextResponse.json({
          success: true,
          data: null,
        });
      }
      
      return NextResponse.json({
        success: true,
        data: status,
      });
    } else {
      const allJobs = await cronManager.getAllJobs();
      // Filter to only Eitje jobs
      const eitjeJobs = allJobs.filter(job => 
        job.jobType === 'daily-data' || 
        job.jobType === 'master-data' || 
        job.jobType === 'historical-data'
      );
      return NextResponse.json({
        success: true,
        data: eitjeJobs,
      });
    }
  } catch (error: any) {
    console.error('[API /eitje/v2/cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get cron job status',
      },
      { status: 500 }
    );
  }
}

