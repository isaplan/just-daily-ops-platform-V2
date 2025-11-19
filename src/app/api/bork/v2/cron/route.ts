/**
 * POST /api/bork/v2/cron
 * Manage Bork cron jobs
 * 
 * Body:
 * - action: 'start' | 'stop' | 'update' | 'status' | 'run-now'
 * - jobType: 'daily-data' | 'historical-data' | 'master-data'
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
    
    const { action, jobType: jobTypeParam, config } = {
      action: actionFromQuery || body.action,
      jobType: jobTypeFromQuery || body.jobType,
      config: body.config,
    };

    if (!action || !jobTypeParam) {
      return NextResponse.json(
        { success: false, error: 'action and jobType are required' },
        { status: 400 }
      );
    }

    // Map UI job types to actual cron manager job types
    const jobTypeMap: Record<string, string> = {
      'daily-data': 'bork-daily-data',
      'historical-data': 'bork-historical-data',
      'master-data': 'bork-master-data',
    };
    const jobType = jobTypeMap[jobTypeParam] || jobTypeParam;

    const cronManager = getCronManager();

    switch (action) {
      case 'start':
        await cronManager.startJob(jobType);
        return NextResponse.json({
          success: true,
          message: `${jobTypeParam} cron job started`,
        });

      case 'stop':
        await cronManager.stopJob(jobType);
        return NextResponse.json({
          success: true,
          message: `${jobTypeParam} cron job stopped`,
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
          message: `${jobTypeParam} cron job updated`,
        });

      case 'run-now':
        await cronManager.runJobNow(jobType);
        return NextResponse.json({
          success: true,
          message: `${jobTypeParam} cron job executed successfully`,
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
    console.error('[API /bork/v2/cron] Error:', error);
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
    const jobTypeParam = searchParams.get('jobType') as 'daily-data' | 'historical-data' | 'master-data' | null;
    const action = searchParams.get('action'); // For Vercel cron jobs

    // Map UI job types to actual cron manager job types
    const jobTypeMap: Record<string, string> = {
      'daily-data': 'bork-daily-data',
      'historical-data': 'bork-historical-data',
      'master-data': 'bork-master-data',
    };
    const jobType = jobTypeParam ? (jobTypeMap[jobTypeParam] || jobTypeParam) : null;

    // If action is 'run-now', execute the job (Vercel cron calls)
    if (action === 'run-now' && jobType) {
      const cronManager = getCronManager();
      await cronManager.runJobNow(jobType);
      return NextResponse.json({
        success: true,
        message: `${jobTypeParam} cron job executed successfully`,
      });
    }

    const cronManager = getCronManager();

    if (jobTypeParam) {
      const status = await cronManager.getJobStatus(jobType!);
      
      // Return default config if job doesn't exist yet
      if (!status) {
        // Default configs based on job type
        const defaultConfigs: Record<string, any> = {
          'daily-data': {
            jobType: jobTypeParam,
            isActive: false,
            syncInterval: 60,
            enabledEndpoints: { sales: true },
            quietHours: { start: '02:00', end: '06:00' },
            lastRun: null,
          },
          'historical-data': {
            jobType: jobTypeParam,
            isActive: false,
            enabledEndpoints: { sales: true },
            lastRun: null,
          },
          'master-data': {
            jobType: jobTypeParam,
            isActive: false,
            syncInterval: 86400, // 24 hours default
            enabledMasterEndpoints: {
              product_groups: true,
              payment_methods: true,
              cost_centers: true,
              users: true,
            },
            lastRun: null,
          },
        };
        
        return NextResponse.json({
          success: true,
          data: defaultConfigs[jobTypeParam || 'daily-data'] || {
            jobType: jobTypeParam,
            isActive: false,
            lastRun: null,
          },
        });
      }
      
      return NextResponse.json({
        success: true,
        data: status,
      });
    } else {
      const allJobs = await cronManager.getAllJobs();
      // Filter to only Bork jobs
      const borkJobs = allJobs.filter(job => 
        job.jobType === 'bork-daily-data' || 
        job.jobType === 'bork-historical-data' ||
        job.jobType === 'bork-master-data'
      );
      return NextResponse.json({
        success: true,
        data: borkJobs,
      });
    }
  } catch (error: any) {
    console.error('[API /bork/v2/cron] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get cron job status',
      },
      { status: 500 }
    );
  }
}

