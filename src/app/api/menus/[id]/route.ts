import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

/**
 * GET /api/menus/[id]
 * Get a single menu by ID
 */
export async function GET(
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
    
    const db = await getDatabase();
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(id) });
    
    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      menu: {
        ...menu,
        _id: menu._id.toString(),
      },
    });
  } catch (error) {
    console.error('[API] Error fetching menu:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/menus/[id]
 * Update a menu
 */
export async function PUT(
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
    const { title, startDate, endDate, productIds, notes, isActive } = body;
    
    const db = await getDatabase();
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (title !== undefined) updateData.title = title;
    if (productIds !== undefined) updateData.productIds = productIds;
    if (notes !== undefined) updateData.notes = notes;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle date updates
    if (startDate !== undefined || endDate !== undefined) {
      const currentMenu = await db.collection('menus').findOne({ _id: new ObjectId(id) });
      if (!currentMenu) {
        return NextResponse.json(
          { error: 'Menu not found' },
          { status: 404 }
        );
      }
      
      const newStartDate = startDate ? new Date(startDate) : currentMenu.startDate;
      const newEndDate = endDate ? new Date(endDate) : currentMenu.endDate;
      
      // Validate dates don't overlap with other menus
      const overlappingMenus = await db
        .collection('menus')
        .find({
          _id: { $ne: new ObjectId(id) },
          $or: [
            { startDate: { $lte: newEndDate }, endDate: { $gte: newStartDate } },
          ],
        })
        .toArray();
      
      if (overlappingMenus.length > 0) {
        return NextResponse.json(
          {
            error: `Dates overlap with existing menu "${overlappingMenus[0].title}"`,
          },
          { status: 400 }
        );
      }
      
      updateData.startDate = newStartDate;
      updateData.endDate = newEndDate;
      
      // Update neighboring menus' end dates if needed
      if (startDate) {
        const previousMenu = await db
          .collection('menus')
          .findOne(
            { _id: { $ne: new ObjectId(id) }, startDate: { $lt: newStartDate } },
            { sort: { startDate: -1 } }
          );
        
        if (previousMenu && previousMenu.endDate >= newStartDate) {
          const adjustedEndDate = new Date(newStartDate);
          adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
          
          await db.collection('menus').updateOne(
            { _id: previousMenu._id },
            {
              $set: {
                endDate: adjustedEndDate,
                updatedAt: new Date(),
              },
            }
          );
        }
      }
    }
    
    const result = await db.collection('menus').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
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
    console.error('[API] Error updating menu:', error);
    return NextResponse.json(
      { error: 'Failed to update menu' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/menus/[id]
 * Delete a menu
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
    
    const db = await getDatabase();
    const result = await db.collection('menus').deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
    });
  } catch (error) {
    console.error('[API] Error deleting menu:', error);
    return NextResponse.json(
      { error: 'Failed to delete menu' },
      { status: 500 }
    );
  }
}

