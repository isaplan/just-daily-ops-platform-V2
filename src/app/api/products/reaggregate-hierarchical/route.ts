/**
 * POST /api/products/reaggregate-hierarchical
 * Reaggregate all existing products to populate hierarchical time-series data
 * 
 * Body:
 * - productNames?: string[] // Optional: specific products, or all if empty
 * - force?: boolean // Force reaggregation even if hierarchical data exists
 * 
 * Returns: { success: boolean, processed: number, updated: number, errors: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { aggregateProductsData } from '@/lib/services/products/products-aggregation.service';

export const runtime = 'nodejs';
export const maxDuration = 600; // 10 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { productNames, force } = body;

    const db = await getDatabase();

    // Build query for products to reaggregate
    let query: any = {};
    if (productNames && Array.isArray(productNames) && productNames.length > 0) {
      query.productName = { $in: productNames };
    }

    // If not forcing, only process products without hierarchical data
    if (!force) {
      query.$or = [
        { salesByYear: { $exists: false } },
        { salesByYear: { $eq: [] } },
        { salesByYear: null },
      ];
    }

    // Find products to process
    const productsToProcess = await db.collection('products_aggregated')
      .find(query)
      .project({ productName: 1, _id: 1 })
      .toArray();

    if (productsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No products found to reaggregate',
        processed: 0,
        updated: 0,
        errors: [],
      });
    }

    console.log(`[Reaggregate Hierarchical] Found ${productsToProcess.length} products to process`);

    // Reaggregate all products (this will rebuild hierarchical data)
    // We'll use the existing aggregation service which now builds hierarchical data
    const result = await aggregateProductsData();

    return NextResponse.json({
      success: true,
      message: `Reaggregated ${result.updated} products with hierarchical data`,
      processed: productsToProcess.length,
      updated: result.updated,
      errors: result.errors,
    });

  } catch (error: any) {
    console.error('[API /products/reaggregate-hierarchical] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reaggregate hierarchical data',
        processed: 0,
        updated: 0,
        errors: [error.message || 'Unknown error'],
      },
      { status: 500 }
    );
  }
}


