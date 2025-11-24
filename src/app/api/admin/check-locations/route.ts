/**
 * GET /api/admin/check-locations
 * 
 * Check all locations in MongoDB
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function GET() {
  try {
    const db = await getDatabase();

    const locations = await db.collection('locations').find({}).toArray();

    return NextResponse.json({
      success: true,
      data: {
        count: locations.length,
        locations: locations.map((loc) => ({
          id: loc._id.toString(),
          name: loc.name,
          code: loc.code,
          city: loc.city,
          isActive: loc.isActive,
          createdAt: loc.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('[API /admin/check-locations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check locations',
      },
      { status: 500 }
    );
  }
}











