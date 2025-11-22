/**
 * GET /api/admin/registry-update
 * Manually trigger registry update (for testing/admin)
 * 
 * Auto-triggers via cron job every 3 hours (except 3-10am)
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    // Verify this is an admin request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.includes('Bearer')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();

    // Run registry updater
    const projectRoot = process.cwd();
    const scriptPath = join(projectRoot, 'tools/compliance/registry-auto-updater-v2.js');

    let output = '';
    try {
      output = execSync(`node ${scriptPath}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 30000, // 30 second timeout
      });
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: 'Registry update failed',
          details: error.message,
        },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: 'Registry updated successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      output: output.split('\n').filter((line) => line.trim()),
    });
  } catch (error: any) {
    console.error('[API /admin/registry-update] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update registry',
      },
      { status: 500 }
    );
  }
}


