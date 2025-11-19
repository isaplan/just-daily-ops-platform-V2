import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

/**
 * POST /api/menus/[id]/products
 * Assign products to a menu
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid menu ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { productIds } = body;
    
    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds must be an array' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Verify products exist
    const products = await db
      .collection('products')
      .find({ productName: { $in: productIds } })
      .toArray();
    
    const foundProductNames = products.map((p) => p.productName);
    const notFoundProducts = productIds.filter((name) => !foundProductNames.includes(name));
    
    if (notFoundProducts.length > 0) {
      return NextResponse.json(
        {
          error: `Products not found: ${notFoundProducts.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Update menu
    const result = await db.collection('menus').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          productIds,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      modified: result.modifiedCount,
      assignedProducts: productIds.length,
    });
  } catch (error) {
    console.error('[API] Error assigning products to menu:', error);
    return NextResponse.json(
      { error: 'Failed to assign products' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menus/[id]/products
 * Remove products from a menu
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid menu ID' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { productIds } = body;
    
    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds must be an array' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    const result = await db.collection('menus').updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { productIds: { $in: productIds } } as any,
        $set: { updatedAt: new Date() },
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('[API] Error removing products from menu:', error);
    return NextResponse.json(
      { error: 'Failed to remove products' },
      { status: 500 }
    );
  }
}

