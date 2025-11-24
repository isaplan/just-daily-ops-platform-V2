/**
 * POST /api/products/reaggregate-uncategorized
 * Reaggregate only uncategorized products from raw data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Find all uncategorized products
    const uncategorizedProducts = await db.collection('products_aggregated')
      .find({
        $or: [
          { category: null },
          { category: { $exists: false } },
          { category: 'Uncategorized' },
        ],
      })
      .toArray();
    
    console.log(`[Reaggregate Uncategorized] Found ${uncategorizedProducts.length} uncategorized products`);
    
    if (uncategorizedProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No uncategorized products found',
        updated: 0,
      });
    }
    
    // Load product groups for category mapping
    const productGroups = await db.collection('product_groups').find({}).toArray();
    const groupMap = new Map<string, any>();
    productGroups.forEach((group: any) => {
      groupMap.set(group.groupName, {
        groupId: group._id,
        groupName: group.groupName,
        parentGroupId: group.parentGroupId,
        parentGroupName: group.parentGroupName,
        groupLevel: group.groupLevel,
        locationId: group.locationId,
      });
    });
    
    // Helper function to find main category
    function findMainCategory(categoryName: string): { mainCategory: string | null; category: string } {
      const group = groupMap.get(categoryName);
      if (!group) {
        return { mainCategory: null, category: categoryName };
      }
      
      if (!group.parentGroupId && !group.parentGroupName) {
        if (group.groupLevel === 1) {
          return { mainCategory: categoryName, category: categoryName };
        }
        return { mainCategory: null, category: categoryName };
      }
      
      let currentGroup = group;
      let depth = 0;
      const maxDepth = 10;
      
      while (depth < maxDepth) {
        let parent: any = null;
        
        if (currentGroup.parentGroupName) {
          parent = groupMap.get(currentGroup.parentGroupName) || null;
        }
        
        if (!parent && currentGroup.parentGroupId) {
          for (const [name, g] of groupMap.entries()) {
            if (g.groupId?.toString() === currentGroup.parentGroupId?.toString()) {
              parent = g;
              break;
            }
          }
        }
        
        if (!parent) {
          return { mainCategory: currentGroup.groupName, category: categoryName };
        }
        
        if (!parent.parentGroupId && !parent.parentGroupName) {
          return { mainCategory: parent.groupName, category: categoryName };
        }
        
        currentGroup = parent;
        depth++;
      }
      
      return { mainCategory: currentGroup.groupName, category: categoryName };
    }
    
    let updated = 0;
    let errors: string[] = [];
    
    // Process each uncategorized product
    for (const product of uncategorizedProducts) {
      try {
        const productName = product.productName;
        
        // Find all sales records for this product in raw_data
        const rawDataRecords = await db.collection('bork_raw_data')
          .aggregate([
            { $unwind: '$rawApiResponse' },
            { $unwind: { path: '$rawApiResponse.Orders', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$rawApiResponse.Orders.Lines', preserveNullAndEmptyArrays: true } },
            {
              $match: {
                $or: [
                  { 'rawApiResponse.Orders.Lines.ProductName': productName },
                  { 'rawApiResponse.Orders.Lines.productName': productName },
                  { 'rawApiResponse.Orders.Lines.Name': productName },
                  { 'rawApiResponse.Orders.Lines.name': productName },
                ],
              },
            },
            {
              $project: {
                category: {
                  $ifNull: [
                    '$rawApiResponse.Orders.Lines.GroupName',
                    { $ifNull: ['$rawApiResponse.Orders.Lines.groupName', { $ifNull: ['$rawApiResponse.Orders.Lines.Category', '$rawApiResponse.Orders.Lines.category'] }] },
                  ],
                },
                date: 1,
              },
            },
            { $match: { category: { $ne: null, $exists: true } } },
            { $limit: 100 }, // Sample 100 records to find category
          ])
          .toArray();
        
        if (rawDataRecords.length === 0) {
          // No sales data found - product truly has no category
          console.log(`[Reaggregate Uncategorized] Product "${productName}" has no sales data - keeping as Uncategorized`);
          continue;
        }
        
        // Find the most common category
        const categoryCounts = new Map<string, number>();
        rawDataRecords.forEach((record: any) => {
          const cat = record.category;
          if (cat && typeof cat === 'string') {
            categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
          }
        });
        
        if (categoryCounts.size === 0) {
          // No valid categories found
          console.log(`[Reaggregate Uncategorized] Product "${productName}" has sales but no valid categories - keeping as Uncategorized`);
          continue;
        }
        
        // Get the most common category
        const mostCommonCategory = Array.from(categoryCounts.entries())
          .sort((a, b) => b[1] - a[1])[0][0];
        
        const { mainCategory } = findMainCategory(mostCommonCategory);
        
        // Update the product
        await db.collection('products_aggregated').updateOne(
          { _id: product._id },
          {
            $set: {
              category: mostCommonCategory,
              mainCategory: mainCategory,
              lastAggregated: new Date(),
            },
          }
        );
        
        updated++;
        console.log(`[Reaggregate Uncategorized] Updated "${productName}" to category "${mostCommonCategory}"`);
        
      } catch (error: any) {
        const errorMsg = `Error processing product "${product.productName}": ${error.message}`;
        console.error(`[Reaggregate Uncategorized] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updated} uncategorized products`,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error: any) {
    console.error('[Reaggregate Uncategorized] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to reaggregate uncategorized products',
      },
      { status: 500 }
    );
  }
}



