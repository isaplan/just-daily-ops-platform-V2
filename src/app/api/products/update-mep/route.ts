import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function POST(request: NextRequest) {
  try {
    const { productName, mepLevel, mepMinutes } = await request.json();

    if (!productName || !mepLevel || mepMinutes === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Update or create product
    const result = await db.collection('products').updateOne(
      { productName },
      {
        $set: {
          mepLevel,
          mepMinutes,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          productName,
          createdAt: new Date(),
          isActive: true,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true, 
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (error) {
    console.error('[API] Error updating MEP:', error);
    return NextResponse.json(
      { error: 'Failed to update MEP time' },
      { status: 500 }
    );
  }
}




