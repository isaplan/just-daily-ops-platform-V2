import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, locationId } = body;

    if (!productName) {
      return NextResponse.json(
        { success: false, error: 'productName is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const locationObjectId = locationId ? new ObjectId(locationId) : null;

    // Update product locationId
    const result = await db.collection('products_aggregated').updateMany(
      { productName },
      {
        $set: {
          locationId: locationObjectId,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Updated location for ${result.modifiedCount} product(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('[Update Location API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update location',
      },
      { status: 500 }
    );
  }
}



