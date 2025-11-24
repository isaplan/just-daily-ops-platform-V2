/**
 * Products Aggregation Service
 * 
 * Daily cron job that enriches products_aggregated collection with:
 * - Sales data from bork_raw_data
 * - Category hierarchy from bork_product_groups
 * - Menu associations from menus
 * - Location details
 * - Time-series sales breakdowns (daily/weekly/monthly)
 * 
 * This ensures products_aggregated is the single source of truth
 * for all product-related queries in GraphQL.
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { getYearKey, getMonthKey, getWeekKey, getISOWeek, isOlderThanOneMonth, isOlderThanOneWeek, isCurrentWeek, isToday } from '@/lib/utils/time-helpers';

interface ProductGroup {
  groupId?: string | number;
  groupName: string;
  parentGroupId?: string | number | null;
  parentGroupName?: string | null;
  groupLevel?: number | null;
  locationId?: ObjectId;
}

interface MenuProduct {
  productId: string;
  price?: number;
}

interface Menu {
  _id: ObjectId;
  title: string;
  locationId?: ObjectId;
  productIds: string[];
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
}

/**
 * Load product groups hierarchy
 */
async function loadProductGroups(locationId?: ObjectId): Promise<Map<string, ProductGroup>> {
  const db = await getDatabase();
  const query: any = {};
  if (locationId) {
    query.locationId = locationId;
  }

  const groups = await db.collection('bork_product_groups').find(query).toArray();
  const groupMap = new Map<string, ProductGroup>();

  for (const group of groups) {
    if (group.groupName) {
      groupMap.set(group.groupName, {
        groupId: group.groupId != null ? String(group.groupId) : undefined,
        groupName: group.groupName,
        parentGroupId: group.parentGroupId != null ? String(group.parentGroupId) : null,
        parentGroupName: group.parentGroupName || null,
        groupLevel: group.groupLevel != null ? Number(group.groupLevel) : null,
        locationId: group.locationId,
      });
    }
  }

  return groupMap;
}

/**
 * Find main category from hierarchy
 */
function findMainCategory(
  categoryName: string,
  groupMap: Map<string, ProductGroup>
): { mainCategory: string | null; category: string } {
  const group = groupMap.get(categoryName);
  if (!group) {
    return { mainCategory: null, category: categoryName };
  }

  // If no parent, check if it's a level 1 group (main category)
  if (!group.parentGroupId && !group.parentGroupName) {
    if (group.groupLevel === 1) {
      return { mainCategory: categoryName, category: categoryName };
    }
    return { mainCategory: null, category: categoryName };
  }

  // Traverse up the hierarchy to find root
  let currentGroup = group;
  let depth = 0;
  const maxDepth = 10;

  while (depth < maxDepth) {
    let parent: ProductGroup | null = null;

    if (currentGroup.parentGroupName) {
      parent = groupMap.get(currentGroup.parentGroupName) || null;
    }

    if (!parent && currentGroup.parentGroupId) {
      // Try to find by ID
      for (const [name, g] of groupMap.entries()) {
        if (g.groupId === currentGroup.parentGroupId) {
          parent = g;
          break;
        }
      }
    }

    if (!parent) {
      // No parent found, current is root
      return { mainCategory: currentGroup.groupName, category: categoryName };
    }

    if (!parent.parentGroupId && !parent.parentGroupName) {
      // Parent is root
      return { mainCategory: parent.groupName, category: categoryName };
    }

    currentGroup = parent;
    depth++;
  }

  return { mainCategory: currentGroup.groupName, category: categoryName };
}

/**
 * Load active menus
 */
async function loadMenus(): Promise<Menu[]> {
  const db = await getDatabase();
  const menus = await db.collection('menus').find({}).toArray();
  return menus.map((m: any) => ({
    _id: m._id,
    title: m.title,
    locationId: m.locationId,
    productIds: m.productIds || [],
    startDate: m.startDate,
    endDate: m.endDate,
    isActive: m.isActive,
  }));
}


/**
 * Build hierarchical time-series sales data from daily sales map
 */
function buildHierarchicalSalesData(
  salesByDate: Map<string, { quantity: number; revenueExVat: number; revenueIncVat: number; transactionCount: number; locations: Set<string> }>,
  locationDetails: Map<string, { locationId: ObjectId; locationName: string; lastSoldDate: Date; totalQuantity: number; totalRevenue: number }>,
  locationMap: Map<string, { id: ObjectId; name: string }>
): {
  salesByYear: Array<{
    year: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>;
  salesByMonth: Array<{
    year: string;
    month: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>;
  salesByWeek: Array<{
    year: string;
    week: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>;
  salesByDay: Array<{
    year: string;
    week: string;
    date: string;
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }>;
} {
  // Build hierarchical structure: year -> month -> week -> day -> location
  const yearMap = new Map<string, Map<string, Map<string, Map<string, Map<string, {
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactions: Set<string>;
  }>>>>>>();

  // Process each daily sales record
  for (const [dateStr, dailyData] of salesByDate.entries()) {
    const date = new Date(dateStr + 'T00:00:00.000Z');
    const year = getYearKey(date);
    const month = getMonthKey(date);
    const week = getWeekKey(date);
    const isoWeek = getISOWeek(date); // Full week key for reference

    // Initialize year
    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }
    const monthMap = yearMap.get(year)!;

    // Initialize month
    if (!monthMap.has(month)) {
      monthMap.set(month, new Map());
    }
    const weekMap = monthMap.get(month)!;

    // Initialize week
    if (!weekMap.has(isoWeek)) {
      weekMap.set(isoWeek, new Map());
    }
    const dayMap = weekMap.get(isoWeek)!;

    // Initialize day
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, new Map());
    }
    const locationMap = dayMap.get(dateStr)!;

    // Process locations for this day
    for (const locIdStr of dailyData.locations) {
      if (!locationMap.has(locIdStr)) {
        locationMap.set(locIdStr, {
          quantity: 0,
          revenueExVat: 0,
          revenueIncVat: 0,
          transactions: new Set(),
        });
      }
      const locData = locationMap.get(locIdStr)!;
      locData.quantity += dailyData.quantity;
      locData.revenueExVat += dailyData.revenueExVat;
      locData.revenueIncVat += dailyData.revenueIncVat;
      // Note: transactionCount is approximate (we don't track per-location transactions in daily data)
      // We'll use a simple division approach
    }
  }

  // Build salesByYear array
  const salesByYear: Array<{
    year: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }> = [];

  for (const [year, monthMap] of yearMap.entries()) {
    const yearTotals = {
      totalQuantity: 0,
      totalRevenueExVat: 0,
      totalRevenueIncVat: 0,
      totalTransactions: 0,
    };
    const yearLocationMap = new Map<string, {
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>();

    // Aggregate across all months/weeks/days
    for (const [month, weekMap] of monthMap.entries()) {
      for (const [week, dayMap] of weekMap.entries()) {
        for (const [dateStr, locMap] of dayMap.entries()) {
          const date = new Date(dateStr + 'T00:00:00.000Z');
          const dailyData = salesByDate.get(dateStr);
          if (!dailyData) continue;

          yearTotals.totalQuantity += dailyData.quantity;
          yearTotals.totalRevenueExVat += dailyData.revenueExVat;
          yearTotals.totalRevenueIncVat += dailyData.revenueIncVat;
          yearTotals.totalTransactions += dailyData.transactionCount;

          // Aggregate by location
          for (const [locIdStr, locData] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            if (!yearLocationMap.has(locIdStr)) {
              yearLocationMap.set(locIdStr, {
                locationId: loc.id,
                locationName: loc.name,
                quantity: 0,
                revenueExVat: 0,
                revenueIncVat: 0,
                transactions: 0,
              });
            }
            const yearLoc = yearLocationMap.get(locIdStr)!;
            yearLoc.quantity += locData.quantity;
            yearLoc.revenueExVat += locData.revenueExVat;
            yearLoc.revenueIncVat += locData.revenueIncVat;
            // Approximate transactions per location
            yearLoc.transactions += Math.round(dailyData.transactionCount / dailyData.locations.size);
          }
        }
      }
    }

    salesByYear.push({
      year,
      ...yearTotals,
      byLocation: Array.from(yearLocationMap.values()),
    });
  }

  // Build salesByMonth array (only for months older than 1 month)
  const salesByMonth: Array<{
    year: string;
    month: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }> = [];

  for (const [year, monthMap] of yearMap.entries()) {
    for (const [month, weekMap] of monthMap.entries()) {
      // Extract year and month from "YYYY-MM" format
      const [monthYear, monthNum] = month.split('-');
      const monthDate = new Date(parseInt(monthYear), parseInt(monthNum) - 1, 1);

      // Only include months older than 1 month
      if (!isOlderThanOneMonth(monthDate)) continue;

      const monthTotals = {
        totalQuantity: 0,
        totalRevenueExVat: 0,
        totalRevenueIncVat: 0,
        totalTransactions: 0,
      };
      const monthLocationMap = new Map<string, {
        locationId: ObjectId;
        locationName: string;
        quantity: number;
        revenueExVat: number;
        revenueIncVat: number;
        transactions: number;
      }>();

      // Aggregate across all weeks/days in this month
      for (const [week, dayMap] of weekMap.entries()) {
        for (const [dateStr, locMap] of dayMap.entries()) {
          const dailyData = salesByDate.get(dateStr);
          if (!dailyData) continue;

          monthTotals.totalQuantity += dailyData.quantity;
          monthTotals.totalRevenueExVat += dailyData.revenueExVat;
          monthTotals.totalRevenueIncVat += dailyData.revenueIncVat;
          monthTotals.totalTransactions += dailyData.transactionCount;

          // Aggregate by location
          for (const [locIdStr, locData] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            if (!monthLocationMap.has(locIdStr)) {
              monthLocationMap.set(locIdStr, {
                locationId: loc.id,
                locationName: loc.name,
                quantity: 0,
                revenueExVat: 0,
                revenueIncVat: 0,
                transactions: 0,
              });
            }
            const monthLoc = monthLocationMap.get(locIdStr)!;
            monthLoc.quantity += locData.quantity;
            monthLoc.revenueExVat += locData.revenueExVat;
            monthLoc.revenueIncVat += locData.revenueIncVat;
            monthLoc.transactions += Math.round(dailyData.transactionCount / dailyData.locations.size);
          }
        }
      }

      salesByMonth.push({
        year: monthYear,
        month: monthNum,
        ...monthTotals,
        byLocation: Array.from(monthLocationMap.values()),
      });
    }
  }

  // Build salesByWeek array (only for weeks older than 1 week)
  const salesByWeek: Array<{
    year: string;
    week: string;
    totalQuantity: number;
    totalRevenueExVat: number;
    totalRevenueIncVat: number;
    totalTransactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }> = [];

  for (const [year, monthMap] of yearMap.entries()) {
    for (const [month, weekMap] of monthMap.entries()) {
      for (const [isoWeek, dayMap] of weekMap.entries()) {
        // Extract week start date from ISO week string
        const [weekYear, weekNum] = isoWeek.split('-W');
        const weekStart = new Date(parseInt(weekYear), 0, 1);
        const daysToAdd = (parseInt(weekNum) - 1) * 7;
        weekStart.setDate(weekStart.getDate() + daysToAdd);

        // Only include weeks older than 1 week
        if (!isOlderThanOneWeek(weekStart)) continue;

        const weekTotals = {
          totalQuantity: 0,
          totalRevenueExVat: 0,
          totalRevenueIncVat: 0,
          totalTransactions: 0,
        };
        const weekLocationMap = new Map<string, {
          locationId: ObjectId;
          locationName: string;
          quantity: number;
          revenueExVat: number;
          revenueIncVat: number;
          transactions: number;
        }>();

        // Aggregate across all days in this week
        for (const [dateStr, locMap] of dayMap.entries()) {
          const dailyData = salesByDate.get(dateStr);
          if (!dailyData) continue;

          weekTotals.totalQuantity += dailyData.quantity;
          weekTotals.totalRevenueExVat += dailyData.revenueExVat;
          weekTotals.totalRevenueIncVat += dailyData.revenueIncVat;
          weekTotals.totalTransactions += dailyData.transactionCount;

          // Aggregate by location
          for (const [locIdStr, locData] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            if (!weekLocationMap.has(locIdStr)) {
              weekLocationMap.set(locIdStr, {
                locationId: loc.id,
                locationName: loc.name,
                quantity: 0,
                revenueExVat: 0,
                revenueIncVat: 0,
                transactions: 0,
              });
            }
            const weekLoc = weekLocationMap.get(locIdStr)!;
            weekLoc.quantity += locData.quantity;
            weekLoc.revenueExVat += locData.revenueExVat;
            weekLoc.revenueIncVat += locData.revenueIncVat;
            weekLoc.transactions += Math.round(dailyData.transactionCount / dailyData.locations.size);
          }
        }

        salesByWeek.push({
          year: weekYear,
          week: weekNum,
          ...weekTotals,
          byLocation: Array.from(weekLocationMap.values()),
        });
      }
    }
  }

  // Build salesByDay array (only for current week, excluding today)
  const salesByDay: Array<{
    year: string;
    week: string;
    date: string;
    quantity: number;
    revenueExVat: number;
    revenueIncVat: number;
    transactions: number;
    byLocation: Array<{
      locationId: ObjectId;
      locationName: string;
      quantity: number;
      revenueExVat: number;
      revenueIncVat: number;
      transactions: number;
    }>;
  }> = [];

  const now = new Date();
  const currentYear = getYearKey(now);
  const currentWeek = getWeekKey(now);

  for (const [year, monthMap] of yearMap.entries()) {
    if (year !== currentYear) continue;

    for (const [month, weekMap] of monthMap.entries()) {
      for (const [isoWeek, dayMap] of weekMap.entries()) {
        const [weekYear, weekNum] = isoWeek.split('-W');
        if (weekNum !== currentWeek) continue;

        // Only process current week
        for (const [dateStr, locMap] of dayMap.entries()) {
          const date = new Date(dateStr + 'T00:00:00.000Z');
          
          // Exclude today
          if (isToday(date)) continue;

          const dailyData = salesByDate.get(dateStr);
          if (!dailyData) continue;

          const dayLocations: Array<{
            locationId: ObjectId;
            locationName: string;
            quantity: number;
            revenueExVat: number;
            revenueIncVat: number;
            transactions: number;
          }> = [];

          // Build location array for this day
          for (const [locIdStr, locData] of locMap.entries()) {
            const loc = locationMap.get(locIdStr);
            if (!loc) continue;

            dayLocations.push({
              locationId: loc.id,
              locationName: loc.name,
              quantity: locData.quantity,
              revenueExVat: locData.revenueExVat,
              revenueIncVat: locData.revenueIncVat,
              transactions: Math.round(dailyData.transactionCount / dailyData.locations.size),
            });
          }

          salesByDay.push({
            year: currentYear,
            week: currentWeek,
            date: dateStr,
            quantity: dailyData.quantity,
            revenueExVat: dailyData.revenueExVat,
            revenueIncVat: dailyData.revenueIncVat,
            transactions: dailyData.transactionCount,
            byLocation: dayLocations,
          });
        }
      }
    }
  }

  // Sort arrays
  salesByYear.sort((a, b) => b.year.localeCompare(a.year));
  salesByMonth.sort((a, b) => {
    const aKey = `${a.year}-${a.month}`;
    const bKey = `${b.year}-${b.month}`;
    return bKey.localeCompare(aKey);
  });
  salesByWeek.sort((a, b) => {
    const aKey = `${a.year}-W${a.week}`;
    const bKey = `${b.year}-W${b.week}`;
    return bKey.localeCompare(aKey);
  });
  salesByDay.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`[Products Aggregation] Hierarchical data built: ${salesByYear.length} years, ${salesByMonth.length} months, ${salesByWeek.length} weeks, ${salesByDay.length} days`);
  
  return {
    salesByYear,
    salesByMonth,
    salesByWeek,
    salesByDay,
  };
  
  return {
    salesByYear,
    salesByMonth,
    salesByWeek,
    salesByDay,
  };
}

/**
 * Aggregate products data from bork_raw_data
 */
export async function aggregateProductsData(
  startDate?: Date,
  endDate?: Date
): Promise<{ updated: number; errors: string[] }> {
  const db = await getDatabase();
  const errors: string[] = [];
  let updated = 0;

  try {
    // Default behavior:
    // - If date range provided: use that range (for specific date filtering)
    // - If NO date range provided: use ALL historical data (from 2020 to now) to process all products
    const now = new Date();
    const queryStartDate = startDate || new Date('2020-01-01');
    const queryEndDate = endDate || now;

    console.log(`[Products Aggregation] Starting aggregation from ${queryStartDate.toISOString()} to ${queryEndDate.toISOString()}`);

    // Load supporting data
    const [productGroups, menus, locations] = await Promise.all([
      loadProductGroups(),
      loadMenus(),
      db.collection('locations').find({ isActive: true }).toArray(),
    ]);

    const locationMap = new Map<string, { id: ObjectId; name: string }>();
    locations.forEach((loc: any) => {
      locationMap.set(loc._id.toString(), { id: loc._id, name: loc.name });
    });

    // Query raw sales data - use ALL data if no specific date range provided
    // Get count for progress tracking
    const totalRecords = await db.collection('bork_raw_data').countDocuments({
      date: {
        $gte: queryStartDate,
        $lte: queryEndDate,
      },
    });
    
    console.log(`[Products Aggregation] Processing ${totalRecords} raw sales records from ${queryStartDate.toISOString()} to ${queryEndDate.toISOString()}`);

    // Process raw data and aggregate by product
    const productAggregates = new Map<
      string,
      {
        productName: string;
        categories: Map<string, { mainCategory: string | null; category: string }>;
        salesByDate: Map<string, { quantity: number; revenueExVat: number; revenueIncVat: number; transactionCount: number; locations: Set<string> }>;
        salesByWeek: Map<string, { quantity: number; revenueExVat: number; revenueIncVat: number; transactionCount: number }>;
        salesByMonth: Map<string, { quantity: number; revenueExVat: number; revenueIncVat: number; transactionCount: number }>;
        locationDetails: Map<string, { locationId: ObjectId; locationName: string; lastSoldDate: Date; totalQuantity: number; totalRevenue: number }>;
        priceHistory: Array<{ date: Date; price: number; quantity: number; locationId?: ObjectId }>;
        totalQuantity: number;
        totalRevenue: number;
        totalTransactions: Set<string>;
        firstSeen: Date;
        lastSeen: Date;
        minPrice: number;
        maxPrice: number;
        prices: number[];
      }
    >();

    // ✅ BATCH PROCESSING: Process records in batches to avoid memory issues
    const BATCH_SIZE = 1000;
    let processedCount = 0;
    const cursor = db.collection('bork_raw_data')
      .find({
        date: {
          $gte: queryStartDate,
          $lte: queryEndDate,
        },
      })
      .sort({ date: 1 })
      .batchSize(BATCH_SIZE);

    // Process each record one at a time (cursor.next() returns single document)
    while (await cursor.hasNext()) {
      const record = await cursor.next();
      if (!record) continue;
      
      processedCount++;
      
      // Log progress every 5000 records
      if (processedCount % 5000 === 0 || processedCount === totalRecords) {
        console.log(`[Products Aggregation] Processed ${processedCount}/${totalRecords} records (${Math.round((processedCount / totalRecords) * 100)}%)...`);
      }
      
      // Process the record
      const rawApiResponse = record.rawApiResponse;
      if (!rawApiResponse) continue;

      const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : [rawApiResponse];
      const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
      const locationId = record.locationId;

      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== 'object') continue;

        const ticketKey = ticket.Key || ticket.key || null;
        const orders = ticket.Orders || ticket.orders || [];

        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines)) continue;

            for (const line of orderLines) {
              if (!line || typeof line !== 'object') continue;

              const category = line.GroupName || line.groupName || line.Category || line.category || 'Uncategorized';
              const { mainCategory } = findMainCategory(category, productGroups);
              const productName = line.ProductName || line.productName || line.Name || line.name || 'Unknown Product';

              if (!productAggregates.has(productName)) {
                productAggregates.set(productName, {
                  productName,
                  categories: new Map(),
                  salesByDate: new Map(),
                  salesByWeek: new Map(),
                  salesByMonth: new Map(),
                  locationDetails: new Map(),
                  priceHistory: [],
                  totalQuantity: 0,
                  totalRevenue: 0,
                  totalTransactions: new Set(),
                  firstSeen: recordDate,
                  lastSeen: recordDate,
                  minPrice: Infinity,
                  maxPrice: -Infinity,
                  prices: [],
                });
              }

              const product = productAggregates.get(productName)!;

              // Update category
              if (!product.categories.has(category)) {
                product.categories.set(category, { mainCategory, category });
              }

              // Extract sales data
              const quantity = Number(line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 1);
              const totalExVat = Number(line.TotalEx ?? line.totalEx ?? line.TotalExVat ?? line.totalExVat ?? 0);
              const totalIncVat = Number(line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? 0);
              const unitPrice = quantity > 0 ? totalIncVat / quantity : 0;

              // Update totals
              product.totalQuantity += quantity;
              product.totalRevenue += totalIncVat;
              if (ticketKey) {
                product.totalTransactions.add(ticketKey);
              }

              // Update date range
              if (recordDate < product.firstSeen) {
                product.firstSeen = recordDate;
              }
              if (recordDate > product.lastSeen) {
                product.lastSeen = recordDate;
              }

              // Update price tracking
              if (unitPrice > 0) {
                product.prices.push(unitPrice);
                if (unitPrice < product.minPrice) product.minPrice = unitPrice;
                if (unitPrice > product.maxPrice) product.maxPrice = unitPrice;
              }

              // Update time-series data
              const dateKey = recordDate.toISOString().split('T')[0];
              const weekKey = getISOWeek(recordDate);
              const monthKey = getMonthKey(recordDate);

              // Daily
              if (!product.salesByDate.has(dateKey)) {
                product.salesByDate.set(dateKey, {
                  quantity: 0,
                  revenueExVat: 0,
                  revenueIncVat: 0,
                  transactionCount: 0,
                  locations: new Set(),
                });
              }
              const daily = product.salesByDate.get(dateKey)!;
              daily.quantity += quantity;
              daily.revenueExVat += totalExVat;
              daily.revenueIncVat += totalIncVat;
              if (ticketKey) daily.transactionCount++;
              if (locationId) daily.locations.add(locationId.toString());

              // Weekly
              if (!product.salesByWeek.has(weekKey)) {
                product.salesByWeek.set(weekKey, {
                  quantity: 0,
                  revenueExVat: 0,
                  revenueIncVat: 0,
                  transactionCount: 0,
                });
              }
              const weekly = product.salesByWeek.get(weekKey)!;
              weekly.quantity += quantity;
              weekly.revenueExVat += totalExVat;
              weekly.revenueIncVat += totalIncVat;
              if (ticketKey) weekly.transactionCount++;

              // Monthly
              if (!product.salesByMonth.has(monthKey)) {
                product.salesByMonth.set(monthKey, {
                  quantity: 0,
                  revenueExVat: 0,
                  revenueIncVat: 0,
                  transactionCount: 0,
                });
              }
              const monthly = product.salesByMonth.get(monthKey)!;
              monthly.quantity += quantity;
              monthly.revenueExVat += totalExVat;
              monthly.revenueIncVat += totalIncVat;
              if (ticketKey) monthly.transactionCount++;

              // Location details
              if (locationId) {
                const locKey = locationId.toString();
                if (!product.locationDetails.has(locKey)) {
                  const loc = locationMap.get(locKey);
                  product.locationDetails.set(locKey, {
                    locationId,
                    locationName: loc?.name || 'Unknown',
                    lastSoldDate: recordDate,
                    totalQuantity: 0,
                    totalRevenue: 0,
                  });
                }
                const locDetail = product.locationDetails.get(locKey)!;
                locDetail.totalQuantity += quantity;
                locDetail.totalRevenue += totalIncVat;
                if (recordDate > locDetail.lastSoldDate) {
                  locDetail.lastSoldDate = recordDate;
                }
              }

              // Price history (last 30 days)
              if (unitPrice > 0 && locationId) {
                product.priceHistory.push({
                  date: recordDate,
                  price: unitPrice,
                  quantity,
                  locationId,
                });
              }
            }
          }
        }
      }
    }

    console.log(`[Products Aggregation] Completed processing ${processedCount} records, aggregated ${productAggregates.size} unique products`);

    // Load existing products_aggregated to merge with catalog data
    const existingProducts = await db.collection('products_aggregated').find({}).toArray();
    const existingMap = new Map<string, any>();
    existingProducts.forEach((p: any) => {
      existingMap.set(p.productName, p);
    });

    // Update or create products_aggregated documents
    for (const [productName, aggregate] of productAggregates.entries()) {
      try {
        const existing = existingMap.get(productName);
        const now = new Date();

        // Calculate price stats
        const prices = aggregate.prices.filter((p) => p > 0);
        const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
        const latestPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
        const minPrice = aggregate.minPrice === Infinity ? 0 : aggregate.minPrice;
        const maxPrice = aggregate.maxPrice === -Infinity ? 0 : aggregate.maxPrice;

        // Sort price history by date (most recent first) and limit to 30 days
        const recentPriceHistory = aggregate.priceHistory
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, 30);

        // Get menu associations
        const menuIds: ObjectId[] = [];
        const menuPrices: Array<{
          menuId: ObjectId;
          menuTitle: string;
          price: number;
          dateAdded: Date;
          dateRemoved?: Date;
        }> = [];

        for (const menu of menus) {
          if (menu.productIds.includes(productName)) {
            menuIds.push(menu._id);
            // Find price from sales data for this menu
            const menuPrice = recentPriceHistory.find((ph) => ph.locationId?.toString() === menu.locationId?.toString());
            if (menuPrice) {
              menuPrices.push({
                menuId: menu._id,
                menuTitle: menu.title,
                price: menuPrice.price,
                dateAdded: menu.startDate,
                dateRemoved: menu.endDate || undefined,
              });
            }
          }
        }

        // Determine primary category and main category
        let primaryCategory: string | null = null;
        let primaryMainCategory: string | null = null;
        if (aggregate.categories.size > 0) {
          // Use the category with most sales (simplified - use first for now)
          const firstCategory = Array.from(aggregate.categories.values())[0];
          primaryCategory = firstCategory.category || 'Uncategorized';
          primaryMainCategory = firstCategory.mainCategory;
          
          // Debug logging for products that should have categories
          if (!primaryCategory || primaryCategory === 'Uncategorized') {
            console.log(`[Products Aggregation] Product "${productName}" has categories map but primaryCategory is "${primaryCategory}"`);
            console.log(`[Products Aggregation] Categories in map:`, Array.from(aggregate.categories.keys()));
          }
        } else if (aggregate.totalQuantity > 0) {
          // Product has sales but no category data - explicitly set to Uncategorized
          primaryCategory = 'Uncategorized';
          primaryMainCategory = null;
          console.log(`[Products Aggregation] Product "${productName}" has ${aggregate.totalQuantity} sales but no category data - setting to Uncategorized`);
        }

        // Convert time-series Maps to Arrays (keep last 90 days/12 weeks/12 months)
        const salesByDateArray = Array.from(aggregate.salesByDate.entries())
          .map(([date, data]) => ({
            date,
            quantity: data.quantity,
            revenueExVat: data.revenueExVat,
            revenueIncVat: data.revenueIncVat,
            transactionCount: data.transactionCount,
            locationId: data.locations.size === 1 ? new ObjectId(Array.from(data.locations)[0]) : undefined,
          }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 90); // Last 90 days

        const salesByWeekArray = Array.from(aggregate.salesByWeek.entries())
          .map(([week, data]) => ({
            week,
            quantity: data.quantity,
            revenueExVat: data.revenueExVat,
            revenueIncVat: data.revenueIncVat,
            transactionCount: data.transactionCount,
          }))
          .sort((a, b) => b.week.localeCompare(a.week))
          .slice(0, 12); // Last 12 weeks

        const salesByMonthArray = Array.from(aggregate.salesByMonth.entries())
          .map(([month, data]) => ({
            month,
            quantity: data.quantity,
            revenueExVat: data.revenueExVat,
            revenueIncVat: data.revenueIncVat,
            transactionCount: data.transactionCount,
          }))
          .sort((a, b) => b.month.localeCompare(a.month))
          .slice(0, 12); // Last 12 months

        const locationDetailsArray = Array.from(aggregate.locationDetails.values());

        // Build hierarchical time-series data
        const hierarchicalData = buildHierarchicalSalesData(
          aggregate.salesByDate,
          aggregate.locationDetails,
          locationMap
        );

        // Merge with existing hierarchical data if it exists
        let mergedHierarchicalData = hierarchicalData;
        if (existing?.salesByYear || existing?.salesByMonth || existing?.salesByWeek || existing?.salesByDay) {
          // Merge years
          const existingYearsMap = new Map<string, any>();
          if (existing.salesByYear) {
            existing.salesByYear.forEach((y: any) => existingYearsMap.set(y.year, y));
          }
          hierarchicalData.salesByYear.forEach((y) => {
            const existingYear = existingYearsMap.get(y.year);
            if (existingYear) {
              // Merge locations
              const locMap = new Map<string, any>();
              existingYear.byLocation.forEach((loc: any) => locMap.set(loc.locationId.toString(), loc));
              y.byLocation.forEach((loc) => {
                const existingLoc = locMap.get(loc.locationId.toString());
                if (existingLoc) {
                  // Merge totals
                  existingLoc.quantity += loc.quantity;
                  existingLoc.revenueExVat += loc.revenueExVat;
                  existingLoc.revenueIncVat += loc.revenueIncVat;
                  existingLoc.transactions += loc.transactions;
                } else {
                  locMap.set(loc.locationId.toString(), loc);
                }
              });
              y.byLocation = Array.from(locMap.values());
              y.totalQuantity = y.byLocation.reduce((sum, loc) => sum + loc.quantity, 0);
              y.totalRevenueExVat = y.byLocation.reduce((sum, loc) => sum + loc.revenueExVat, 0);
              y.totalRevenueIncVat = y.byLocation.reduce((sum, loc) => sum + loc.revenueIncVat, 0);
              y.totalTransactions = y.byLocation.reduce((sum, loc) => sum + loc.transactions, 0);
            } else {
              existingYearsMap.set(y.year, y);
            }
          });
          mergedHierarchicalData.salesByYear = Array.from(existingYearsMap.values());

          // Similar merging logic for months, weeks, and days (simplified for now - can enhance later)
          // For now, we'll prioritize new data but keep existing if no overlap
          if (existing.salesByMonth) {
            const existingMonthsMap = new Map<string, any>();
            existing.salesByMonth.forEach((m: any) => {
              const key = `${m.year}-${m.month}`;
              existingMonthsMap.set(key, m);
            });
            hierarchicalData.salesByMonth.forEach((m) => {
              const key = `${m.year}-${m.month}`;
              if (!existingMonthsMap.has(key)) {
                existingMonthsMap.set(key, m);
              }
            });
            mergedHierarchicalData.salesByMonth = Array.from(existingMonthsMap.values());
          }

          if (existing.salesByWeek) {
            const existingWeeksMap = new Map<string, any>();
            existing.salesByWeek.forEach((w: any) => {
              const key = `${w.year}-W${w.week}`;
              existingWeeksMap.set(key, w);
            });
            hierarchicalData.salesByWeek.forEach((w) => {
              const key = `${w.year}-W${w.week}`;
              if (!existingWeeksMap.has(key)) {
                existingWeeksMap.set(key, w);
              }
            });
            mergedHierarchicalData.salesByWeek = Array.from(existingWeeksMap.values());
          }

          if (existing.salesByDay) {
            const existingDaysMap = new Map<string, any>();
            existing.salesByDay.forEach((d: any) => existingDaysMap.set(d.date, d));
            hierarchicalData.salesByDay.forEach((d) => {
              if (!existingDaysMap.has(d.date)) {
                existingDaysMap.set(d.date, d);
              }
            });
            mergedHierarchicalData.salesByDay = Array.from(existingDaysMap.values());
          }
        }

        // Merge with existing product data (preserve catalog fields)
        const updateDoc: any = {
          // Update sales statistics
          totalQuantitySold: aggregate.totalQuantity,
          totalRevenue: aggregate.totalRevenue,
          totalTransactions: aggregate.totalTransactions.size,
          firstSeen: aggregate.firstSeen,
          lastSeen: aggregate.lastSeen,

          // Update price information
          averagePrice,
          latestPrice,
          minPrice,
          maxPrice,
          priceHistory: recentPriceHistory.map((ph) => ({
            date: ph.date,
            price: ph.price,
            quantity: ph.quantity,
            locationId: ph.locationId,
          })),

          // Update menu associations
          menuIds,
          menuPrices,

          // Update location details
          locationDetails: locationDetailsArray,

          // Update time-series data (deprecated, kept for backward compatibility)
          salesByDate: salesByDateArray,
          salesByWeek: salesByWeekArray,
          salesByMonth: salesByMonthArray,

          // Update hierarchical time-series data (NEW)
          salesByYear: mergedHierarchicalData.salesByYear,
          salesByMonth: mergedHierarchicalData.salesByMonth,
          salesByWeek: mergedHierarchicalData.salesByWeek,
          salesByDay: mergedHierarchicalData.salesByDay,

          // Update timestamps
          updatedAt: now,
          lastAggregated: now,
        };

        // Update category (always update if we have category data from raw_data)
        // IMPORTANT: Always set category if we have sales data
        // If primaryCategory is null but we have sales, set to 'Uncategorized'
        // If primaryCategory exists (even if 'Uncategorized'), use it
        if (primaryCategory !== null) {
          updateDoc.category = primaryCategory;
          if (primaryMainCategory !== null) {
            updateDoc.mainCategory = primaryMainCategory;
          }
        } else if (aggregate.totalQuantity > 0) {
          // Product has sales but no category data - explicitly set to Uncategorized
          updateDoc.category = 'Uncategorized';
          updateDoc.mainCategory = null;
        }
        // If primaryCategory is null AND no sales, don't set category (preserve existing or leave null)

        if (existing) {
          // ✅ Merge locationDetails instead of overwriting (preserve historical data)
          const existingLocationDetails = existing.locationDetails || [];
          const existingLocationMap = new Map<string, any>();
          existingLocationDetails.forEach((loc: any) => {
            const locId = loc.locationId?.toString();
            if (locId) {
              existingLocationMap.set(locId, loc);
            }
          });

          // Merge new locationDetails with existing ones
          locationDetailsArray.forEach((newLoc) => {
            const locKey = newLoc.locationId?.toString();
            if (!locKey) return;
            
            const existingLoc = existingLocationMap.get(locKey);
            
            if (existingLoc) {
              // Merge: keep the most recent lastSoldDate and sum totals
              existingLocationMap.set(locKey, {
                ...existingLoc,
                lastSoldDate: newLoc.lastSoldDate > existingLoc.lastSoldDate 
                  ? newLoc.lastSoldDate 
                  : existingLoc.lastSoldDate,
                totalQuantity: (existingLoc.totalQuantity || 0) + newLoc.totalQuantity,
                totalRevenue: (existingLoc.totalRevenue || 0) + newLoc.totalRevenue,
              });
            } else {
              // New location, add it
              existingLocationMap.set(locKey, newLoc);
            }
          });

          // Update updateDoc with merged locationDetails
          updateDoc.locationDetails = Array.from(existingLocationMap.values());

          // ✅ Preserve catalog fields (workload, mep, courseType, notes, etc.) if they exist
          if (existing.workloadLevel) updateDoc.workloadLevel = existing.workloadLevel;
          if (existing.workloadMinutes) updateDoc.workloadMinutes = existing.workloadMinutes;
          if (existing.mepLevel) updateDoc.mepLevel = existing.mepLevel;
          if (existing.mepMinutes) updateDoc.mepMinutes = existing.mepMinutes;
          if (existing.courseType) updateDoc.courseType = existing.courseType;
          if (existing.notes) updateDoc.notes = existing.notes;
          if (existing.isActive !== undefined) updateDoc.isActive = existing.isActive;
          if (existing.productSku) updateDoc.productSku = existing.productSku;
          if (existing.vatRate) updateDoc.vatRate = existing.vatRate;
          if (existing.costPrice) updateDoc.costPrice = existing.costPrice;

          // Update existing product
          await db.collection('products_aggregated').updateOne(
            { _id: existing._id },
            { $set: updateDoc }
          );
        } else {
          // Create new product (with defaults from catalog if available)
          const newProduct = {
            productName,
            category: primaryCategory || null,
            mainCategory: primaryMainCategory || null,
            productSku: null,
            locationId: null, // Global product

            // Workload & MEP (defaults, will be updated from catalog)
            workloadLevel: 'mid' as const,
            workloadMinutes: 5,
            mepLevel: 'low' as const,
            mepMinutes: 1,
            courseType: null,
            notes: null,
            isActive: true,

            // Sales data
            ...updateDoc,

            // Metadata
            vatRate: null,
            costPrice: null,

            // Timestamps
            createdAt: now,
          };

          await db.collection('products_aggregated').insertOne(newProduct);
        }

        updated++;
      } catch (error: any) {
        const errorMsg = `Failed to update product "${productName}": ${error.message}`;
        errors.push(errorMsg);
        console.error(`[Products Aggregation] ${errorMsg}`);
      }
    }

    console.log(`[Products Aggregation] Completed: ${updated} products updated, ${errors.length} errors`);

    return { updated, errors };
  } catch (error: any) {
    console.error('[Products Aggregation] Fatal error:', error);
    throw error;
  }
}

