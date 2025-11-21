import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';

/**
 * GET /api/menus
 * Get all menus, optionally filtered
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const currentDate = searchParams.get('currentDate'); // ISO date string
    
    const db = await getDatabase();
    const query: any = {};
    
    if (activeOnly) {
      query.isActive = true;
    }
    
    // Filter by current date (menus that overlap with this date)
    if (currentDate) {
      const date = new Date(currentDate);
      query.startDate = { $lte: date };
      query.endDate = { $gte: date };
    }
    
    const menus = await db
      .collection('menus')
      .find(query)
      .sort({ startDate: -1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      menus: menus.map((menu) => {
        const serialized: any = {
          ...menu,
          _id: menu._id.toString(),
        };
        
        // Serialize dates safely
        if (menu.startDate) {
          serialized.startDate = menu.startDate instanceof Date 
            ? menu.startDate.toISOString() 
            : new Date(menu.startDate).toISOString();
        }
        if (menu.endDate) {
          serialized.endDate = menu.endDate instanceof Date 
            ? menu.endDate.toISOString() 
            : new Date(menu.endDate).toISOString();
        }
        if (menu.createdAt) {
          serialized.createdAt = menu.createdAt instanceof Date 
            ? menu.createdAt.toISOString() 
            : new Date(menu.createdAt).toISOString();
        }
        if (menu.updatedAt) {
          serialized.updatedAt = menu.updatedAt instanceof Date 
            ? menu.updatedAt.toISOString() 
            : new Date(menu.updatedAt).toISOString();
        }
        
        // Ensure productPrices array is properly serialized
        if (menu.productPrices && Array.isArray(menu.productPrices)) {
          serialized.productPrices = menu.productPrices.map((pp: any) => ({
            productName: pp.productName,
            price: pp.price || 0,
            dateAdded: pp.dateAdded 
              ? (pp.dateAdded instanceof Date ? pp.dateAdded.toISOString() : new Date(pp.dateAdded).toISOString())
              : null,
            dateRemoved: pp.dateRemoved 
              ? (pp.dateRemoved instanceof Date ? pp.dateRemoved.toISOString() : new Date(pp.dateRemoved).toISOString())
              : undefined,
          }));
        } else {
          serialized.productPrices = [];
        }
        
        return serialized;
      }),
    });
  } catch (error) {
    console.error('[API] Error fetching menus:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menus' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/menus
 * Create a new menu
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, startDate, endDate, productIds, notes, isActive } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startDate' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    
    // Parse dates
    const start = new Date(startDate);
    let end = endDate ? new Date(endDate) : null;
    
    // If no end date provided, calculate it as day before next menu starts
    if (!end) {
      // Find next menu after this start date
      const nextMenu = await db
        .collection('menus')
        .findOne(
          { startDate: { $gt: start } },
          { sort: { startDate: 1 } }
        );
      
      if (nextMenu) {
        end = new Date(nextMenu.startDate);
        end.setDate(end.getDate() - 1);
      } else {
        // Default: 3 months from start
        end = new Date(start);
        end.setMonth(end.getMonth() + 3);
      }
    }
    
    // Validate dates don't overlap with existing menus
    const overlappingMenus = await db
      .collection('menus')
      .find({
        $or: [
          { startDate: { $lte: end }, endDate: { $gte: start } },
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
    
    // Create menu
    const menu = {
      title,
      startDate: start,
      endDate: end,
      productIds: productIds || [],
      isActive: isActive !== undefined ? isActive : true,
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection('menus').insertOne(menu);
    
    // Update end dates of previous menus if needed
    const previousMenu = await db
      .collection('menus')
      .findOne(
        { startDate: { $lt: start } },
        { sort: { startDate: -1 } }
      );
    
    if (previousMenu && previousMenu.endDate >= start) {
      const newEndDate = new Date(start);
      newEndDate.setDate(newEndDate.getDate() - 1);
      
      await db.collection('menus').updateOne(
        { _id: previousMenu._id },
        {
          $set: {
            endDate: newEndDate,
            updatedAt: new Date(),
          },
        }
      );
    }
    
    return NextResponse.json({
      success: true,
      menu: {
        ...menu,
        _id: result.insertedId.toString(),
      },
    });
  } catch (error) {
    console.error('[API] Error creating menu:', error);
    return NextResponse.json(
      { error: 'Failed to create menu' },
      { status: 500 }
    );
  }
}

