import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

export async function POST(request: NextRequest) {
  try {
    const { productName, workloadLevel, workloadMinutes } = await request.json();

    if (!productName || !workloadLevel || workloadMinutes === undefined) {
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
          workloadLevel,
          workloadMinutes,
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
    console.error('[API] Error updating workload:', error);
    return NextResponse.json(
      { error: 'Failed to update workload' },
      { status: 500 }
    );
  }
}


