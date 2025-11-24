import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productName, category } = body;

    if (!productName || !category) {
      return NextResponse.json(
        { success: false, error: 'productName and category are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Update all products with this name (may have multiple location-specific entries)
    const result = await db.collection('products_aggregated').updateMany(
      { productName },
      {
        $set: {
          category,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `Updated category to "${category}" for ${result.modifiedCount} product(s)`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('[Update Category API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update category',
      },
      { status: 500 }
    );
  }
}



