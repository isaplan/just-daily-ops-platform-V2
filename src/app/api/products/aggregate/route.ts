/**
 * Products Aggregation API Route
 * 
 * Daily cron job endpoint to aggregate products data
 * Enriches products_aggregated collection with sales data
 */

import { NextRequest, NextResponse } from 'next/server';
import { aggregateProductsData } from '@/lib/services/products/products-aggregation.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { startDate, endDate } = body;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    console.log('[Products Aggregation API] Starting aggregation...');

    const result = await aggregateProductsData(start, end);

    return NextResponse.json({
      success: true,
      message: `Aggregated ${result.updated} products`,
      ...result,
    });
  } catch (error: any) {
    console.error('[Products Aggregation API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to aggregate products',
      },
      { status: 500 }
    );
  }
}

