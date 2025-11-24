/**
 * GET /api/products/diagnose-uncategorized
 * Diagnose why products are uncategorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Get uncategorized products
    const uncategorizedProducts = await db.collection('products_aggregated')
      .find({
        $or: [
          { category: null },
          { category: { $exists: false } },
          { category: 'Uncategorized' },
        ],
      })
      .limit(50)
      .toArray();
    
    console.log(`[Diagnose Uncategorized] Found ${uncategorizedProducts.length} uncategorized products`);
    
    // Check if these products have category data in raw_data
    const diagnostics = await Promise.all(
      uncategorizedProducts.slice(0, 10).map(async (product) => {
        const productName = product.productName;
        
        // Search for this product in raw_data
        const rawDataSamples = await db.collection('bork_raw_data')
          .aggregate([
            { $unwind: '$rawApiResponse' },
            { $unwind: { path: '$rawApiResponse.Orders', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$rawApiResponse.Orders.Lines', preserveNullAndEmptyArrays: true } },
            {
              $match: {
                $or: [
                  { 'rawApiResponse.Orders.Lines.ProductName': productName },
                  { 'rawApiResponse.Orders.Lines.productName': productName },
                  { 'rawApiResponse.Orders.Lines.Name': productName },
                  { 'rawApiResponse.Orders.Lines.name': productName },
                ],
              },
            },
            {
              $project: {
                productName: {
                  $ifNull: [
                    '$rawApiResponse.Orders.Lines.ProductName',
                    { $ifNull: ['$rawApiResponse.Orders.Lines.productName', { $ifNull: ['$rawApiResponse.Orders.Lines.Name', '$rawApiResponse.Orders.Lines.name'] }] },
                  ],
                },
                category: {
                  $ifNull: [
                    '$rawApiResponse.Orders.Lines.GroupName',
                    { $ifNull: ['$rawApiResponse.Orders.Lines.groupName', { $ifNull: ['$rawApiResponse.Orders.Lines.Category', '$rawApiResponse.Orders.Lines.category'] }] },
                  ],
                },
                date: 1,
              },
            },
            { $limit: 5 },
          ])
          .toArray();
        
        return {
          productName,
          currentCategory: product.category || null,
          hasSalesData: rawDataSamples.length > 0,
          sampleCategories: rawDataSamples.map((s: any) => s.category).filter(Boolean),
          sampleDates: rawDataSamples.map((s: any) => s.date),
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      totalUncategorized: uncategorizedProducts.length,
      diagnostics,
    });
  } catch (error: any) {
    console.error('[Diagnose Uncategorized] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to diagnose uncategorized products',
      },
      { status: 500 }
    );
  }
}



