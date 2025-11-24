/**
 * GET /api/admin/check-shift-collections
 * Checks all collections that might contain shift/hours data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Check different potential shift collections
    const results: any = {};
    
    // 1. Check eitje_raw_data endpoints
    const endpoints = await db.collection('eitje_raw_data').distinct('endpoint');
    results.eitje_raw_data_endpoints = endpoints;
    
    for (const endpoint of ['time_registration_shifts', 'shifts', 'hours']) {
      const count = await db.collection('eitje_raw_data').countDocuments({ endpoint });
      if (count > 0) {
        results[`eitje_raw_data_${endpoint}`] = {
          count,
          sample: await db.collection('eitje_raw_data').findOne({ endpoint })
        };
      }
    }
    
    // 2. Check processed collections
    const processedCollections = [
      'eitje_time_registration_shifts_processed_v2',
      'hours_data',
      'shifts_data',
      'time_registration_shifts'
    ];
    
    for (const coll of processedCollections) {
      try {
        const count = await db.collection(coll).countDocuments();
        if (count > 0) {
          results[coll] = {
            count,
            sample: await db.collection(coll).findOne()
          };
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }
    
    return NextResponse.json({
      success: true,
      data: results
    });
    
  } catch (error: any) {
    console.error('[Check Shift Collections] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check shift collections',
      },
      { status: 500 }
    );
  }
}




