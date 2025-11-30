/**
 * GET /api/admin/eitje-data-verifier
 * 
 * Verifies Excel data from eitje-data-check-30NOV2025/ against aggregated database
 * Uses finance data to verify labor/productivity metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEitjeData, DateFilter } from '@/lib/services/eitje/eitje-data-verifier.service';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = (searchParams.get('dateFilter') || 'all') as DateFilter;
    
    // Validate date filter
    const validFilters: DateFilter[] = ['this-week', 'this-month', 'last-month', 'this-year', 'last-year', 'all'];
    const filter = validFilters.includes(dateFilter) ? dateFilter : 'all';
    
    const result = await verifyEitjeData(filter);
    
    return NextResponse.json({
      success: true,
      dateFilter: filter,
      ...result
    });
  } catch (error: any) {
    console.error('[Eitje Data Verifier API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to verify Eitje data',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

