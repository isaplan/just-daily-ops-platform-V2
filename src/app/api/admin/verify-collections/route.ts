/**
 * GET /api/admin/verify-collections
 * 
 * Verify that all required aggregated collections exist and have data
 * 
 * Returns: { success: boolean, collections: {...} }
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    const collections = [
      'sales_line_items_aggregated',
      'transactions_aggregated',
      'processed_hours_aggregated',
      'bork_aggregated',
      'eitje_aggregated',
      'products_aggregated',
    ];

    const results: Record<string, any> = {};

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments({});
        const sample = await collection.findOne({});
        
        // Check indexes
        const indexes = await collection.indexes();
        
        results[collectionName] = {
          exists: true,
          recordCount: count,
          hasData: count > 0,
          hasSample: !!sample,
          indexesCount: indexes.length,
          indexes: indexes.map((idx: any) => ({
            name: idx.name,
            key: idx.key,
          })),
        };
      } catch (error: any) {
        results[collectionName] = {
          exists: false,
          error: error.message,
        };
      }
    }

    const allHaveData = Object.values(results).every((r: any) => r.hasData);
    const allHaveIndexes = Object.values(results).every((r: any) => r.indexesCount > 0);

    return NextResponse.json({
      success: true,
      allCollectionsHaveData: allHaveData,
      allCollectionsHaveIndexes: allHaveIndexes,
      collections: results,
    });
  } catch (error: any) {
    console.error('Error verifying collections:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to verify collections',
      },
      { status: 500 }
    );
  }
}







