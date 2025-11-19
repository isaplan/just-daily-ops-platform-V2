/**
 * GET /api/bork/v2/categories-products/aggregate
 * 
 * Aggregate sales data by category and product with daily/weekly/monthly breakdowns
 * 
 * Query params:
 * - startDate: required - YYYY-MM-DD format
 * - endDate: required - YYYY-MM-DD format
 * - locationId: optional - filter by location
 * - category: optional - filter by category
 * - productName: optional - filter by product name
 * 
 * ⚠️ REST API - COMMENTED OUT - DELETE WHEN GRAPHQL IS WORKING PROPERLY
 * This endpoint is no longer used. The application now uses GraphQL via:
 * - GraphQL Query: categoriesProductsAggregate
 * - Service: src/lib/services/sales/categories-products.service.ts
 * - GraphQL Resolver: src/lib/graphql/v2-resolvers.ts
 */

/*
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { 
  CategoryAggregate,
  MainCategoryAggregate,
  ProductAggregate, 
  TimePeriodTotals,
  CategoriesProductsResponse 
} from '@/models/sales/categories-products.model';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds

// Helper function to get ISO week number
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

// Helper function to get month key (YYYY-MM)
function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper function to get date key (YYYY-MM-DD)
function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to initialize TimePeriodTotals
function initTotals(): TimePeriodTotals {
  return {
    quantity: 0,
    revenueExVat: 0,
    revenueIncVat: 0,
    transactionCount: 0,
  };
}

// Helper to add totals
function addTotals(target: TimePeriodTotals, source: TimePeriodTotals): void {
  target.quantity += source.quantity;
  target.revenueExVat += source.revenueExVat;
  target.revenueIncVat += source.revenueIncVat;
  target.transactionCount += source.transactionCount;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const category = searchParams.get('category');
    const productName = searchParams.get('productName');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    // Convert dates to UTC for querying
    const start = new Date(startDate + 'T00:00:00.000Z');
    let end: Date;
    if (startDate === endDate) {
      // Day view: extend to next day 02:00 Amsterdam time (01:00 UTC)
      const endDateObj = new Date(endDate + 'T00:00:00.000Z');
      endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
      endDateObj.setUTCHours(1, 0, 0, 0);
      end = endDateObj;
    } else {
      // Month/Year view: use end of the selected end date
      const endDateObj = new Date(endDate + 'T00:00:00.000Z');
      endDateObj.setUTCHours(23, 59, 59, 999);
      end = endDateObj;
    }

    // Build query
    const query: { [key: string]: unknown; date?: { $gte: Date; $lte: Date } } = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

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

    // Load product groups hierarchy from bork_product_groups
    const productGroupsQuery: any = {};
    if (locationObjectId) {
      productGroupsQuery.locationId = locationObjectId;
    }
    
    const productGroups = await db.collection('bork_product_groups')
      .find(productGroupsQuery)
      .toArray();

    // Build hierarchy maps:
    // 1. groupName -> product group info (for quick lookup)
    // 2. groupId -> product group info (for parent lookup)
    // 3. Build parent chain to find root/main category
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

    // Helper function to traverse up the parent chain to find root/main category
    const findMainCategory = (groupName: string): { mainCategory: string | null; category: string } => {
      const groupInfo = groupNameMap.get(groupName);
      if (!groupInfo) {
        // Category not found in product groups - use as-is (flat structure)
        return { mainCategory: null, category: groupName };
      }

      // If no parent, this is a root/main category
      if (!groupInfo.parentGroupId && !groupInfo.parentGroupName) {
        // Check groupLevel: Level 1 = main category, Level 2+ might still be a category
        if (groupInfo.groupLevel === 1) {
          return { mainCategory: groupName, category: groupName };
        }
        // No parent but level > 1 - treat as category without main category
        return { mainCategory: null, category: groupName };
      }

      // Traverse up the parent chain to find the root/main category
      // Strategy: Go up until we find a parent with no parent (root/main category)
      let currentGroup = groupInfo;
      let rootCategory: string | null = null;
      let depth = 0;
      const maxDepth = 10; // Prevent infinite loops
      
      while (depth < maxDepth) {
        // Find parent
        let parentInfo: typeof currentGroup | null = null;
        
        // Try to find parent by name first
        if (currentGroup.parentGroupName) {
          parentInfo = groupNameMap.get(currentGroup.parentGroupName) || null;
        }
        
        // If not found by name, try by ID
        if (!parentInfo && currentGroup.parentGroupId) {
          parentInfo = groupIdMap.get(currentGroup.parentGroupId) || null;
        }
        
        // If no parent found, we've reached the root
        if (!parentInfo) {
          // Use the last found root category, or immediate parent name
          if (rootCategory) {
            return { mainCategory: rootCategory, category: groupName };
          }
          if (currentGroup.parentGroupName) {
            return { mainCategory: currentGroup.parentGroupName, category: groupName };
          }
          return { mainCategory: null, category: groupName };
        }
        
        // If parent has no parent, we've found the root/main category
        if (!parentInfo.parentGroupId && !parentInfo.parentGroupName) {
          rootCategory = parentInfo.groupName || currentGroup.parentGroupName || null;
          return { mainCategory: rootCategory, category: groupName };
        }
        
        // Parent has a parent - continue traversing up
        rootCategory = parentInfo.groupName || currentGroup.parentGroupName || null;
        currentGroup = parentInfo;
        depth++;
      }
      
      // If we've gone too deep, use what we found or fallback
      if (rootCategory) {
        return { mainCategory: rootCategory, category: groupName };
      }
      
      // Fallback: use immediate parent as main category
      if (groupInfo.parentGroupName) {
        return { mainCategory: groupInfo.parentGroupName, category: groupName };
      }
      
      // Fallback: use groupLevel
      if (groupInfo.groupLevel === 1) {
        return { mainCategory: groupName, category: groupName };
      }
      
      // Default: no main category found
      return { mainCategory: null, category: groupName };
    };

    // Fetch raw data records
    const rawDataRecords = await db.collection('bork_raw_data')
      .find(query)
      .toArray();

    // Data structures for aggregation
    // mainCategory -> category -> product -> period -> totals
    const mainCategoryMap = new Map<string, Map<string, Map<string, {
      daily: Map<string, TimePeriodTotals>; // date -> totals
      weekly: Map<string, TimePeriodTotals>; // week -> totals
      monthly: Map<string, TimePeriodTotals>; // month -> totals
      transactions: Set<string>; // unique transaction IDs (ticket_key)
    }>>>();
    
    // Fallback: category -> product -> period -> totals (when no main category)
    const categoryProductMap = new Map<string, Map<string, {
      daily: Map<string, TimePeriodTotals>; // date -> totals
      weekly: Map<string, TimePeriodTotals>; // week -> totals
      monthly: Map<string, TimePeriodTotals>; // month -> totals
      transactions: Set<string>; // unique transaction IDs (ticket_key)
    }>>();

    // Process raw data
    for (const record of rawDataRecords) {
      const rawApiResponse = record.rawApiResponse;
      if (!rawApiResponse) continue;

      const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : [rawApiResponse];
      const recordDate = record.date instanceof Date 
        ? record.date 
        : typeof record.date === 'string' 
          ? new Date(record.date) 
          : new Date();

      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== 'object') continue;

        const ticketKey = ticket.Key || ticket.key || null;
        const orders = ticket.Orders || ticket.orders || [];

        // Process line items from Orders -> Lines
        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines)) continue;

            for (const line of orderLines) {
              if (!line || typeof line !== 'object') continue;

              // Extract category from line data
              const lineCategory = line.GroupName || line.groupName || line.Category || line.category;
              if (!lineCategory) continue;

              // Use product groups hierarchy to find main category
              const { mainCategory, category: categoryName } = findMainCategory(lineCategory);
              
              // Apply category filter (check both main and sub category)
              if (category && category !== 'all') {
                if (categoryName !== category && mainCategory !== category && lineCategory !== category) continue;
              }

              // Apply product filter
              const lineProductName = line.ProductName || line.productName || line.Name || line.name;
              if (!lineProductName) continue;
              if (productName && !lineProductName.toLowerCase().includes(productName.toLowerCase())) continue;

              const productNameKey = lineProductName;

              // Use hierarchical structure if we have a main category
              const hasMainCategory = !!mainCategory && mainCategory !== categoryName;
              let productMap: Map<string, {
                daily: Map<string, TimePeriodTotals>;
                weekly: Map<string, TimePeriodTotals>;
                monthly: Map<string, TimePeriodTotals>;
                transactions: Set<string>;
              }>;
              
              if (hasMainCategory) {
                // Use hierarchical structure: mainCategory -> category -> product
                if (!mainCategoryMap.has(mainCategory)) {
                  mainCategoryMap.set(mainCategory, new Map());
                }
                const categoryMap = mainCategoryMap.get(mainCategory)!;
                
                if (!categoryMap.has(categoryName)) {
                  categoryMap.set(categoryName, new Map());
                }
                productMap = categoryMap.get(categoryName)!;
              } else {
                // Use flat structure: category -> product (when no main category or main = category)
                if (!categoryProductMap.has(categoryName)) {
                  categoryProductMap.set(categoryName, new Map());
                }
                productMap = categoryProductMap.get(categoryName)!;
              }

              // Get or create product entry
              if (!productMap.has(productNameKey)) {
                productMap.set(productNameKey, {
                  daily: new Map(),
                  weekly: new Map(),
                  monthly: new Map(),
                  transactions: new Set(),
                });
              }
              const productData = productMap.get(productNameKey)!;

              // Extract line data
              const quantity = Math.abs(line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 1);
              const totalExVat = line.TotalEx ?? line.totalEx ?? line.TotalExVat ?? line.totalExVat ?? line.RevenueExVat ?? line.revenueExVat ?? 0;
              const totalIncVat = line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? line.RevenueIncVat ?? line.revenueIncVat ?? 0;

              // Calculate period keys
              const dateKey = getDateKey(recordDate);
              const weekKey = getISOWeek(recordDate);
              const monthKey = getMonthKey(recordDate);

              // Initialize period totals if needed
              if (!productData.daily.has(dateKey)) {
                productData.daily.set(dateKey, initTotals());
              }
              if (!productData.weekly.has(weekKey)) {
                productData.weekly.set(weekKey, initTotals());
              }
              if (!productData.monthly.has(monthKey)) {
                productData.monthly.set(monthKey, initTotals());
              }

              // Add to daily totals
              const dailyTotals = productData.daily.get(dateKey)!;
              dailyTotals.quantity += quantity;
              dailyTotals.revenueExVat += Number(totalExVat) || 0;
              dailyTotals.revenueIncVat += Number(totalIncVat) || 0;

              // Add to weekly totals
              const weeklyTotals = productData.weekly.get(weekKey)!;
              weeklyTotals.quantity += quantity;
              weeklyTotals.revenueExVat += Number(totalExVat) || 0;
              weeklyTotals.revenueIncVat += Number(totalIncVat) || 0;

              // Add to monthly totals
              const monthlyTotals = productData.monthly.get(monthKey)!;
              monthlyTotals.quantity += quantity;
              monthlyTotals.revenueExVat += Number(totalExVat) || 0;
              monthlyTotals.revenueIncVat += Number(totalIncVat) || 0;

              // Track unique transactions
              if (ticketKey) {
                productData.transactions.add(ticketKey);
              }
            }
          }
        }
      }
    }

    // Calculate transaction counts for each period
    // For simplicity, we'll use the total transaction count for all periods
    // (more accurate would require tracking transactions per period, but that's complex)
    
    // Process flat structure
    for (const [categoryName, productMap] of categoryProductMap.entries()) {
      for (const [productName, productData] of productMap.entries()) {
        const totalTransactions = productData.transactions.size;
        
        // Set transaction count for all periods (using total as approximation)
        for (const totals of productData.daily.values()) {
          totals.transactionCount = totalTransactions;
        }
        for (const totals of productData.weekly.values()) {
          totals.transactionCount = totalTransactions;
        }
        for (const totals of productData.monthly.values()) {
          totals.transactionCount = totalTransactions;
        }
      }
    }
    
    // Process hierarchical structure
    for (const [mainCategoryName, categoryMap] of mainCategoryMap.entries()) {
      for (const [categoryName, productMap] of categoryMap.entries()) {
        for (const [productName, productData] of productMap.entries()) {
          const totalTransactions = productData.transactions.size;
          
          // Set transaction count for all periods
          for (const totals of productData.daily.values()) {
            totals.transactionCount = totalTransactions;
          }
          for (const totals of productData.weekly.values()) {
            totals.transactionCount = totalTransactions;
          }
          for (const totals of productData.monthly.values()) {
            totals.transactionCount = totalTransactions;
          }
        }
      }
    }

    // Build response structure
    const categories: CategoryAggregate[] = [];
    const mainCategories: MainCategoryAggregate[] = [];
    const grandTotals = {
      daily: initTotals(),
      weekly: initTotals(),
      monthly: initTotals(),
      total: initTotals(),
    };

    // Check if we have main categories
    const hasMainCategories = mainCategoryMap.size > 0;
    
    if (hasMainCategories) {
      // Build hierarchical structure
      const sortedMainCategories = Array.from(mainCategoryMap.entries()).sort((a, b) => 
        a[0].localeCompare(b[0])
      );
      
      for (const [mainCategoryName, categoryMap] of sortedMainCategories) {
        const mainCategoryDaily = initTotals();
        const mainCategoryWeekly = initTotals();
        const mainCategoryMonthly = initTotals();
        const mainCategoryTotal = initTotals();
        
        const categoryAggregates: CategoryAggregate[] = [];
        const sortedCategories = Array.from(categoryMap.entries()).sort((a, b) => 
          a[0].localeCompare(b[0])
        );
        
        for (const [categoryName, productMap] of sortedCategories) {
          const categoryDaily = initTotals();
          const categoryWeekly = initTotals();
          const categoryMonthly = initTotals();
          const categoryTotal = initTotals();
          
          const products: ProductAggregate[] = [];
          const sortedProducts = Array.from(productMap.entries()).sort((a, b) => 
            a[0].localeCompare(b[0])
          );
          
          for (const [productName, productData] of sortedProducts) {
            const productDaily = initTotals();
            for (const totals of productData.daily.values()) {
              addTotals(productDaily, totals);
            }
            
            const productWeekly = initTotals();
            for (const totals of productData.weekly.values()) {
              addTotals(productWeekly, totals);
            }
            
            const productMonthly = initTotals();
            for (const totals of productData.monthly.values()) {
              addTotals(productMonthly, totals);
            }
            
            const productTotal = initTotals();
            addTotals(productTotal, productDaily);
            addTotals(productTotal, productWeekly);
            addTotals(productTotal, productMonthly);
            
            addTotals(categoryDaily, productDaily);
            addTotals(categoryWeekly, productWeekly);
            addTotals(categoryMonthly, productMonthly);
            addTotals(categoryTotal, productTotal);
            
            products.push({
              productName,
              daily: productDaily,
              weekly: productWeekly,
              monthly: productMonthly,
              total: productTotal,
            });
          }
          
          addTotals(mainCategoryDaily, categoryDaily);
          addTotals(mainCategoryWeekly, categoryWeekly);
          addTotals(mainCategoryMonthly, categoryMonthly);
          addTotals(mainCategoryTotal, categoryTotal);
          
          categoryAggregates.push({
            categoryName,
            mainCategoryName,
            products,
            daily: categoryDaily,
            weekly: categoryWeekly,
            monthly: categoryMonthly,
            total: categoryTotal,
          });
        }
        
        addTotals(grandTotals.daily, mainCategoryDaily);
        addTotals(grandTotals.weekly, mainCategoryWeekly);
        addTotals(grandTotals.monthly, mainCategoryMonthly);
        addTotals(grandTotals.total, mainCategoryTotal);
        
        mainCategories.push({
          mainCategoryName,
          categories: categoryAggregates,
          daily: mainCategoryDaily,
          weekly: mainCategoryWeekly,
          monthly: mainCategoryMonthly,
          total: mainCategoryTotal,
        });
        
        // Also add to flat categories list for backward compatibility
        categories.push(...categoryAggregates);
      }
    } else {
      // Build flat structure (existing logic)
      const sortedCategories = Array.from(categoryProductMap.entries()).sort((a, b) => 
        a[0].localeCompare(b[0])
      );

      for (const [categoryName, productMap] of sortedCategories) {
        const categoryDaily = initTotals();
        const categoryWeekly = initTotals();
        const categoryMonthly = initTotals();
        const categoryTotal = initTotals();

        const products: ProductAggregate[] = [];

        // Sort products alphabetically
        const sortedProducts = Array.from(productMap.entries()).sort((a, b) => 
          a[0].localeCompare(b[0])
        );

        for (const [productName, productData] of sortedProducts) {
          // Aggregate daily totals
          const productDaily = initTotals();
          for (const totals of productData.daily.values()) {
            addTotals(productDaily, totals);
          }

          // Aggregate weekly totals
          const productWeekly = initTotals();
          for (const totals of productData.weekly.values()) {
            addTotals(productWeekly, totals);
          }

          // Aggregate monthly totals
          const productMonthly = initTotals();
          for (const totals of productData.monthly.values()) {
            addTotals(productMonthly, totals);
          }

          // Calculate product total
          const productTotal = initTotals();
          addTotals(productTotal, productDaily);
          addTotals(productTotal, productWeekly);
          addTotals(productTotal, productMonthly);

          // Add to category totals
          addTotals(categoryDaily, productDaily);
          addTotals(categoryWeekly, productWeekly);
          addTotals(categoryMonthly, productMonthly);
          addTotals(categoryTotal, productTotal);

          products.push({
            productName,
            daily: productDaily,
            weekly: productWeekly,
            monthly: productMonthly,
            total: productTotal,
          });
        }

        // Add to grand totals
        addTotals(grandTotals.daily, categoryDaily);
        addTotals(grandTotals.weekly, categoryWeekly);
        addTotals(grandTotals.monthly, categoryMonthly);
        addTotals(grandTotals.total, categoryTotal);

        categories.push({
          categoryName,
          products,
          daily: categoryDaily,
          weekly: categoryWeekly,
          monthly: categoryMonthly,
          total: categoryTotal,
        });
      }
    }

    const response: CategoriesProductsResponse = {
      success: true,
      categories,
      mainCategories: hasMainCategories ? mainCategories : undefined,
      totals: grandTotals,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[API /bork/v2/categories-products/aggregate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to aggregate categories/products data',
      },
      { status: 500 }
    );
  }
}
*/

