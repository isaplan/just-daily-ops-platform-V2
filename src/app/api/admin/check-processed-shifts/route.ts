/**
 * GET /api/admin/check-processed-shifts
 * Checks if eitje_time_registration_shifts_processed_v2 has more data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Check processed shifts collection
    const processedCount = await db.collection('eitje_time_registration_shifts_processed_v2')
      .countDocuments();
    
    // Get unique users from processed collection
    const processedUsers = await db.collection('eitje_time_registration_shifts_processed_v2')
      .distinct('user_id');
    
    // Sample record
    const sampleProcessed = await db.collection('eitje_time_registration_shifts_processed_v2')
      .findOne();
    
    // Check raw shifts for comparison
    const rawCount = await db.collection('eitje_raw_data')
      .countDocuments({ endpoint: 'time_registration_shifts' });
    
    const rawUsers = await db.collection('eitje_raw_data')
      .aggregate([
        { $match: { endpoint: 'time_registration_shifts' } },
        {
          $group: {
            _id: {
              $ifNull: [
                '$extracted.user_id',
                { $ifNull: ['$extracted.userId', { $ifNull: ['$rawApiResponse.user_id', '$rawApiResponse.userId'] }] }
              ]
            }
          }
        }
      ])
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: {
        processed: {
          count: processedCount,
          uniqueUsers: processedUsers.length,
          sample: sampleProcessed
        },
        raw: {
          count: rawCount,
          uniqueUsers: rawUsers.length
        },
        comparison: {
          moreInProcessed: processedCount > rawCount,
          differenceCount: Math.abs(processedCount - rawCount),
          differenceUsers: Math.abs(processedUsers.length - rawUsers.length)
        }
      }
    });
    
  } catch (error: any) {
    console.error('[Check Processed Shifts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check processed shifts',
      },
      { status: 500 }
    );
  }
}


