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
 * Get ISO week string
 */
function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = d.getUTCFullYear();
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get month key
 */
function getMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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
    // Default to last 90 days if no date range provided
    const now = new Date();
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(defaultStartDate.getDate() - 90);

    const queryStartDate = startDate || defaultStartDate;
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

    // Query raw sales data
    const rawData = await db.collection('bork_raw_data')
      .find({
        date: {
          $gte: queryStartDate,
          $lte: queryEndDate,
        },
      })
      .toArray();

    console.log(`[Products Aggregation] Processing ${rawData.length} raw sales records`);

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

    // Process each raw record
    for (const record of rawData) {
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

    console.log(`[Products Aggregation] Aggregated ${productAggregates.size} unique products`);

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
          primaryCategory = firstCategory.category;
          primaryMainCategory = firstCategory.mainCategory;
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

          // Update category (if not set or if we have better data)
          ...(primaryCategory && { category: primaryCategory }),
          ...(primaryMainCategory && { mainCategory: primaryMainCategory }),

          // Update menu associations
          menuIds,
          menuPrices,

          // Update location details
          locationDetails: locationDetailsArray,

          // Update time-series data
          salesByDate: salesByDateArray,
          salesByWeek: salesByWeekArray,
          salesByMonth: salesByMonthArray,

          // Update timestamps
          updatedAt: now,
          lastAggregated: now,
        };

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

