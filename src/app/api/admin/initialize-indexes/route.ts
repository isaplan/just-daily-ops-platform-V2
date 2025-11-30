/**
 * POST /api/admin/initialize-indexes
 * 
 * Initialize all MongoDB indexes
 * 
 * Returns: { success: boolean, message: string }
 */

import { NextResponse } from 'next/server';
import { createAllIndexes } from '@/lib/mongodb/v2-indexes';

export const maxDuration = 60; // 1 minute
export const runtime = 'nodejs';

export async function POST() {
  try {
    await createAllIndexes();
    return NextResponse.json({
      success: true,
      message: 'All indexes created successfully',
    });
  } catch (error: any) {
    console.error('Error initializing indexes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to initialize indexes',
      },
      { status: 500 }
    );
  }
}







