/**
 * GET /api/bork/v2/products
 * 
 * Get unique products grouped by category from Bork sales data
 * 
 * Query params:
 * - startDate: optional - YYYY-MM-DD format
 * - endDate: optional - YYYY-MM-DD format
 * - locationId: optional - filter by location
 * - category: optional - filter by specific category
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const category = searchParams.get('category');

    const db = await getDatabase();

    // Build query for bork_raw_data collection
    const query: { [key: string]: unknown; date?: { $gte: Date; $lte: Date } } = {};

    // Date filtering
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Location filter
    let locationObjectId: ObjectId | null = null;
    if (locationId && locationId !== 'all') {
      try {
        locationObjectId = new ObjectId(locationId);
        query.locationId = locationObjectId;
      } catch (e) {
        console.warn(`Invalid locationId: ${locationId}`);
      }
    }

    // Load product groups hierarchy from bork_product_groups (same as aggregate endpoint)
    const productGroupsQuery: any = {};
    if (locationObjectId) {
      productGroupsQuery.locationId = locationObjectId;
    }
    
    const productGroups = await db.collection('bork_product_groups')
      .find(productGroupsQuery)
      .toArray();

    // Build hierarchy maps (same logic as aggregate endpoint)
    const groupNameMap = new Map<string, {
      groupId: string;
      groupName: string;
      parentGroupId: string | null;
      parentGroupName: string | null;
      groupLevel: number | null;
    }>();
    
    const groupIdMap = new Map<string, {
      groupId: string;
      groupName: string;
      parentGroupId: string | null;
      parentGroupName: string | null;
      groupLevel: number | null;
    }>();

    for (const pg of productGroups) {
      const groupId = pg.groupId != null ? String(pg.groupId) : null;
      const parentGroupId = pg.parentGroupId != null ? String(pg.parentGroupId) : null;
      
      const groupInfo = {
        groupId,
        groupName: pg.groupName || null,
        parentGroupId,
        parentGroupName: pg.parentGroupName || null,
        groupLevel: pg.groupLevel != null ? Number(pg.groupLevel) : null,
      };
      
      if (groupInfo.groupName) {
        groupNameMap.set(groupInfo.groupName, groupInfo);
      }
      if (groupInfo.groupId) {
        groupIdMap.set(groupInfo.groupId, groupInfo);
      }
    }

    // Helper function to find root/main category (same as aggregate endpoint)
    const findMainCategory = (groupName: string): { mainCategory: string | null; category: string } => {
      const groupInfo = groupNameMap.get(groupName);
      if (!groupInfo) {
        return { mainCategory: null, category: groupName };
      }

      if (!groupInfo.parentGroupId && !groupInfo.parentGroupName) {
        if (groupInfo.groupLevel === 1) {
          return { mainCategory: groupName, category: groupName };
        }
        return { mainCategory: null, category: groupName };
      }

      // Traverse up the parent chain to find the root/main category
      let currentGroup = groupInfo;
      let rootCategory: string | null = null;
      let depth = 0;
      const maxDepth = 10;
      
      while (depth < maxDepth) {
        let parentInfo: typeof currentGroup | null = null;
        
        if (currentGroup.parentGroupName) {
          parentInfo = groupNameMap.get(currentGroup.parentGroupName) || null;
        }
        
        if (!parentInfo && currentGroup.parentGroupId) {
          parentInfo = groupIdMap.get(currentGroup.parentGroupId) || null;
        }
        
        if (!parentInfo) {
          if (rootCategory) {
            return { mainCategory: rootCategory, category: groupName };
          }
          if (currentGroup.parentGroupName) {
            return { mainCategory: currentGroup.parentGroupName, category: groupName };
          }
          return { mainCategory: null, category: groupName };
        }
        
        if (!parentInfo.parentGroupId && !parentInfo.parentGroupName) {
          rootCategory = parentInfo.groupName || currentGroup.parentGroupName || null;
          return { mainCategory: rootCategory, category: groupName };
        }
        
        rootCategory = parentInfo.groupName || currentGroup.parentGroupName || null;
        currentGroup = parentInfo;
        depth++;
      }
      
      if (rootCategory) {
        return { mainCategory: rootCategory, category: groupName };
      }
      
      if (groupInfo.parentGroupName) {
        return { mainCategory: groupInfo.parentGroupName, category: groupName };
      }
      
      if (groupInfo.groupLevel === 1) {
        return { mainCategory: groupName, category: groupName };
      }
      
      return { mainCategory: null, category: groupName };
    };

    // Fetch raw data records
    const rawDataRecords = await db.collection('bork_raw_data')
      .find(query)
      .limit(500) // Limit to avoid memory issues
      .toArray();

    // Extract products grouped by category (using hierarchy mapping)
    // Structure: mainCategory -> category -> product -> quantity
    const mainCategoryMap = new Map<string, Map<string, Map<string, number>>>();
    const categoryProductMap = new Map<string, Map<string, number>>(); // Fallback for flat structure

    for (const record of rawDataRecords) {
      const rawApiResponse = record.rawApiResponse;
      if (!rawApiResponse) continue;

      const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : [rawApiResponse];

      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== 'object') continue;

        const orders = ticket.Orders || ticket.orders || [];
        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines)) continue;

            for (const line of orderLines) {
              if (!line || typeof line !== 'object') continue;
              
              const lineCategory = line.GroupName || line.groupName || line.Category || line.category;
              const lineProductName = line.ProductName || line.productName || line.Name || line.name;
              
              if (!lineCategory || !lineProductName) continue;

              // Use product groups hierarchy to find main category
              const { mainCategory, category: categoryName } = findMainCategory(lineCategory);

              // Apply category filter (check both main and sub category)
              if (category && category !== 'all') {
                if (categoryName !== category && mainCategory !== category && lineCategory !== category) continue;
              }

              const productName = lineProductName.trim();
              const quantity = Math.abs(line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 0);

              // Use hierarchical structure if we have a main category
              const hasMainCategory = !!mainCategory && mainCategory !== categoryName;
              
              if (hasMainCategory) {
                // mainCategory -> category -> product
                if (!mainCategoryMap.has(mainCategory)) {
                  mainCategoryMap.set(mainCategory, new Map());
                }
                const categoryMap = mainCategoryMap.get(mainCategory)!;
                
                if (!categoryMap.has(categoryName)) {
                  categoryMap.set(categoryName, new Map());
                }
                const productMap = categoryMap.get(categoryName)!;
                productMap.set(productName, (productMap.get(productName) || 0) + quantity);
              } else {
                // Flat structure: category -> product
                if (!categoryProductMap.has(categoryName)) {
                  categoryProductMap.set(categoryName, new Map());
                }
                const productMap = categoryProductMap.get(categoryName)!;
                productMap.set(productName, (productMap.get(productName) || 0) + quantity);
              }
            }
          }
        }
      }
    }

    // Convert to response format (flattened for filter compatibility)
    const categories: Array<{ category: string; products: Array<{ name: string; quantity: number }> }> = [];

    // Process hierarchical structure (flatten for filters)
    for (const [mainCategoryName, categoryMap] of mainCategoryMap.entries()) {
      for (const [categoryName, productMap] of categoryMap.entries()) {
        // Use category name (not main category) for filter compatibility
        // The aggregate endpoint will handle the hierarchy
        const sortedProducts = Array.from(productMap.entries())
          .sort((a, b) => {
            if (b[1] !== a[1]) {
              return b[1] - a[1];
            }
            return a[0].localeCompare(b[0]);
          })
          .map(([name, quantity]) => ({ name, quantity }));

        categories.push({
          category: categoryName, // Use category name for filter matching
          products: sortedProducts,
        });
      }
    }

    // Process flat structure
    for (const [categoryName, productMap] of categoryProductMap.entries()) {
      // Check if we already added this category from hierarchical structure
      const exists = categories.some(cat => cat.category === categoryName);
      if (exists) continue;

      const sortedProducts = Array.from(productMap.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) {
            return b[1] - a[1];
          }
          return a[0].localeCompare(b[0]);
        })
        .map(([name, quantity]) => ({ name, quantity }));

      categories.push({
        category: categoryName,
        products: sortedProducts,
      });
    }

    // Sort categories alphabetically
    categories.sort((a, b) => a.category.localeCompare(b.category));

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: unknown) {
    console.error('[API /bork/v2/products] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      },
      { status: 500 }
    );
  }
}

