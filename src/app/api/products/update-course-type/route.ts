import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { CourseType } from '@/models/products/product.model';

export async function POST(request: NextRequest) {
  try {
    const { productName, courseType } = await request.json();

    if (!productName) {
      return NextResponse.json(
        { error: 'Missing required field: productName' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Validate course type if provided
    const validCourseTypes: CourseType[] = [
      'snack',
      'voorgerecht',
      'hoofdgerecht',
      'nagerecht',
      'bijgerecht',
      'drank',
      'overig',
    ];
    
    if (courseType && !validCourseTypes.includes(courseType)) {
      return NextResponse.json(
        { error: 'Invalid course type' },
        { status: 400 }
      );
    }
    
    // Update or create product
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (courseType) {
      updateData.courseType = courseType;
    } else {
      // If courseType is null, remove it
      updateData.$unset = { courseType: '' };
    }
    
    const result = await db.collection('products').updateOne(
      { productName },
      {
        $set: courseType ? updateData : { updatedAt: new Date() },
        ...(courseType ? {} : { $unset: { courseType: '' } }),
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
    console.error('[API] Error updating course type:', error);
    return NextResponse.json(
      { error: 'Failed to update course type' },
      { status: 500 }
    );
  }
}

