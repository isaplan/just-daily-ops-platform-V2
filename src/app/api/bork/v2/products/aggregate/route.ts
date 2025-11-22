/**
 * POST /api/bork/v2/products/aggregate
 * GET /api/bork/v2/products/aggregate?status=true
 * 
 * Aggregate products from Bork raw data into products_aggregated collection
 * This creates a fast lookup table for product information (names, prices, categories)
 * 
 * POST Body:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - locationId: ObjectId (optional) - filter by location
 * 
 * GET Query:
 * - status: boolean - Returns last aggregated timestamp
 * 
 * Returns: { success: boolean, productsAggregated: number, message: string, lastAggregated?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') === 'true';

    if (status) {
      // Return last aggregated timestamp
      const db = await getDatabase();
      const latest = await db.collection('products_aggregated')
        .findOne(
          { lastAggregated: { $exists: true } },
          { sort: { lastAggregated: -1 } }
        );

      return NextResponse.json({
        success: true,
        lastAggregated: latest?.lastAggregated?.toISOString() || null,
        totalProducts: await db.collection('products_aggregated').countDocuments({}),
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Use POST to aggregate products or GET with ?status=true to check status',
    }, { status: 400 });
  } catch (error: unknown) {
    console.error('[API /bork/v2/products/aggregate] GET Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get aggregation status',
      },
      { status: 500 }
    );
  }
}

// Helper function to extract price from line item
const extractPrice = (line: Record<string, unknown>): number | null => {
  // Try unit price first
  if (line.UnitPrice !== undefined && typeof line.UnitPrice === 'number' && line.UnitPrice > 0) return line.UnitPrice;
  if (line.unitPrice !== undefined && typeof line.unitPrice === 'number' && line.unitPrice > 0) return line.unitPrice;
  if (line.Price !== undefined && typeof line.Price === 'number' && line.Price > 0) return line.Price;
  if (line.price !== undefined && typeof line.price === 'number' && line.price > 0) return line.price;
  
  // Try total price (divide by quantity)
  const quantity = (typeof line.Quantity === 'number' ? line.Quantity : typeof line.quantity === 'number' ? line.quantity : 1);
  if (line.TotalPrice !== undefined && typeof line.TotalPrice === 'number' && line.TotalPrice > 0) {
    return line.TotalPrice / quantity;
  }
  if (line.totalPrice !== undefined && typeof line.totalPrice === 'number' && line.totalPrice > 0) {
    return line.totalPrice / quantity;
  }
  
  // Try revenue ex VAT
  if (line.TotalExVat !== undefined && typeof line.TotalExVat === 'number' && line.TotalExVat > 0) {
    return line.TotalExVat / quantity;
  }
  if (line.totalExVat !== undefined && typeof line.totalExVat === 'number' && line.totalExVat > 0) {
    return line.totalExVat / quantity;
  }
  
  // Try revenue inc VAT (calculate ex VAT)
  const vatRate = (typeof line.VatRate === 'number' ? line.VatRate : typeof line.vatRate === 'number' ? line.vatRate : 0);
  if (line.TotalIncVat !== undefined && typeof line.TotalIncVat === 'number' && line.TotalIncVat > 0) {
    const exVat = line.TotalIncVat / (1 + (vatRate / 100));
    return exVat / quantity;
  }
  if (line.totalIncVat !== undefined && typeof line.totalIncVat === 'number' && line.totalIncVat > 0) {
    const exVat = line.totalIncVat / (1 + (vatRate / 100));
    return exVat / quantity;
  }
  
  return null;
};

// Helper to determine main category from category name
const getMainCategory = (category?: string): string => {
  if (!category) return 'Other';
  const lower = category.toLowerCase();
  if (lower.includes('bar') || lower.includes('drink') || lower.includes('beverage')) return 'Bar';
  if (lower.includes('keuken') || lower.includes('kitchen') || lower.includes('food')) return 'Keuken';
  return 'Other';
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, locationId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Build query
    const query: {
      date: { $gte: Date; $lte: Date };
      locationId?: ObjectId;
    } = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    if (locationId) {
      try {
        query.locationId = new ObjectId(locationId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid locationId format' },
          { status: 400 }
        );
      }
    }

    // ✅ NOTE: This fetches all raw data for aggregation
    // This is acceptable because:
    // 1. Background job (runs via cron, not user-facing)
    // 2. Needs all data to calculate accurate aggregations
    // 3. Has 5-minute timeout (maxDuration = 300)
    // 4. Uses indexed queries (locationId + date)
    // For very large datasets (>100k records), consider batching in chunks
    const rawData = await db.collection('bork_raw_data')
      .find(query)
      .toArray();

    if (rawData.length === 0) {
      return NextResponse.json({
        success: true,
        productsAggregated: 0,
        message: 'No raw data found to aggregate',
      });
    }

    // Map: productName_locationId -> product data
    const productMap = new Map<string, {
      productName: string;
      locationId: ObjectId;
      category?: string;
      mainCategory: string;
      productSku?: string;
      prices: number[];
      priceHistory: Array<{ date: Date; price: number; quantity: number }>;
      quantities: number[];
      revenues: number[];
      transactions: Set<string>; // ticket_number + date
      vatRates: number[];
      costPrices: number[];
      firstSeen: Date;
      lastSeen: Date;
    }>();

    // Process raw data
    for (const record of rawData) {
      const rawApiResponse = record.rawApiResponse;
      if (!rawApiResponse) continue;

      const recordDate = new Date(record.date);
      const recordLocationId = record.locationId;

      const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : [rawApiResponse];

      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== 'object') continue;

        const ticketNumber = ticket.TicketNumber || ticket.ticketNumber || '';
        const ticketKey = `${ticketNumber}_${recordDate.toISOString()}`;

        const orders = ticket.Orders || ticket.orders || [];
        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines)) continue;

            for (const line of orderLines) {
              if (!line || typeof line !== 'object') continue;

              const productName = (line.ProductName || line.productName || line.Name || line.name) as string;
              if (!productName || typeof productName !== 'string' || productName.trim() === '' || productName === 'Ticket Total') {
                continue;
              }

              const trimmedName = productName.trim();
              const category = (line.Category || line.category) as string | undefined;
              const productSku = (line.ProductSku || line.productSku) as string | undefined;
              const quantity = (typeof line.Quantity === 'number' ? line.Quantity : typeof line.quantity === 'number' ? line.quantity : 1) as number;
              const price = extractPrice(line);
              const vatRate = (typeof line.VatRate === 'number' ? line.VatRate : typeof line.vatRate === 'number' ? line.vatRate : undefined) as number | undefined;
              const costPrice = (typeof line.CostPrice === 'number' ? line.CostPrice : typeof line.costPrice === 'number' ? line.costPrice : undefined) as number | undefined;

              // Calculate revenue
              const revenue = price && price > 0 ? price * quantity : 0;

              // Create key: productName_locationId (or just productName if no location)
              const key = recordLocationId ? `${trimmedName}_${recordLocationId.toString()}` : trimmedName;

              if (!productMap.has(key)) {
                productMap.set(key, {
                  productName: trimmedName,
                  locationId: recordLocationId,
                  category,
                  mainCategory: getMainCategory(category),
                  productSku,
                  prices: [],
                  priceHistory: [],
                  quantities: [],
                  revenues: [],
                  transactions: new Set(),
                  vatRates: [],
                  costPrices: [],
                  firstSeen: recordDate,
                  lastSeen: recordDate,
                });
              }

              const productData = productMap.get(key)!;
              
              // Add price if valid
              if (price && price > 0) {
                productData.prices.push(price);
                // Keep last 30 days of price history
                productData.priceHistory.push({
                  date: recordDate,
                  price,
                  quantity,
                });
                // Keep only last 30 days
                if (productData.priceHistory.length > 30) {
                  productData.priceHistory = productData.priceHistory
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 30);
                }
              }

              productData.quantities.push(quantity);
              productData.revenues.push(revenue);
              productData.transactions.add(ticketKey);

              if (vatRate !== undefined) {
                productData.vatRates.push(vatRate);
              }
              if (costPrice !== undefined && costPrice > 0) {
                productData.costPrices.push(costPrice);
              }

              if (recordDate < productData.firstSeen) {
                productData.firstSeen = recordDate;
              }
              if (recordDate > productData.lastSeen) {
                productData.lastSeen = recordDate;
              }
            }
          }
        }
      }
    }

    // Convert to aggregated records
    const aggregatedProducts = Array.from(productMap.values()).map((data) => {
      // Calculate averages
      const averagePrice = data.prices.length > 0
        ? data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
        : 0;

      const latestPrice = data.prices.length > 0
        ? data.prices[data.prices.length - 1]
        : 0;

      const minPrice = data.prices.length > 0
        ? Math.min(...data.prices)
        : 0;

      const maxPrice = data.prices.length > 0
        ? Math.max(...data.prices)
        : 0;

      const totalQuantitySold = data.quantities.reduce((sum, q) => sum + q, 0);
      const totalRevenue = data.revenues.reduce((sum, r) => sum + r, 0);
      const totalTransactions = data.transactions.size;

      const avgVatRate = data.vatRates.length > 0
        ? data.vatRates.reduce((sum, r) => sum + r, 0) / data.vatRates.length
        : undefined;

      const avgCostPrice = data.costPrices.length > 0
        ? data.costPrices.reduce((sum, c) => sum + c, 0) / data.costPrices.length
        : undefined;

      // Sort price history by date (newest first)
      const sortedPriceHistory = data.priceHistory
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 30); // Keep last 30 days

      return {
        productName: data.productName,
        locationId: data.locationId,
        category: data.category,
        mainCategory: data.mainCategory,
        productSku: data.productSku,
        averagePrice: Math.round(averagePrice * 100) / 100,
        latestPrice: Math.round(latestPrice * 100) / 100,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        priceHistory: sortedPriceHistory,
        totalQuantitySold: Math.round(totalQuantitySold * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTransactions,
        firstSeen: data.firstSeen,
        lastSeen: data.lastSeen,
        vatRate: avgVatRate ? Math.round(avgVatRate * 100) / 100 : undefined,
        costPrice: avgCostPrice ? Math.round(avgCostPrice * 100) / 100 : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // ✅ Merge with existing products collection (workload/MEP data)
    // Load existing products catalog for workload/MEP metrics
    const existingProducts = await db.collection('products').find({ isActive: true }).toArray();
    const productCatalogMap = new Map<string, any>();
    existingProducts.forEach((p: any) => {
      productCatalogMap.set(p.productName, {
        workloadLevel: p.workloadLevel,
        workloadMinutes: p.workloadMinutes,
        mepLevel: p.mepLevel,
        mepMinutes: p.mepMinutes,
        courseType: p.courseType,
        notes: p.notes,
        isActive: p.isActive !== undefined ? p.isActive : true,
      });
    });

    // ✅ Merge catalog data with aggregated sales data
    const now = new Date();
    const mergedProducts = aggregatedProducts.map((product) => {
      const catalogData = productCatalogMap.get(product.productName);
      return {
        ...product,
        // Merge workload/MEP from catalog
        workloadLevel: catalogData?.workloadLevel || null,
        workloadMinutes: catalogData?.workloadMinutes || null,
        mepLevel: catalogData?.mepLevel || null,
        mepMinutes: catalogData?.mepMinutes || null,
        courseType: catalogData?.courseType || null,
        notes: catalogData?.notes || null,
        isActive: catalogData?.isActive !== undefined ? catalogData.isActive : true,
        lastAggregated: now, // Track when aggregation ran
      };
    });

    // Upsert aggregated products
    let productsAggregated = 0;
    if (mergedProducts.length > 0) {
      const operations = mergedProducts.map((product) => {
        // Separate fields for $set and $setOnInsert
        const { createdAt, ...updateFields } = product;
        return {
          updateOne: {
            filter: {
              productName: product.productName,
              locationId: product.locationId || null,
            },
            update: { 
              $set: updateFields,
              $setOnInsert: { createdAt: now }, // Only set on insert
            },
            upsert: true,
          },
        };
      });

      const result = await db.collection('products_aggregated').bulkWrite(operations);
      productsAggregated = result.upsertedCount + result.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      productsAggregated,
      message: `Successfully aggregated ${productsAggregated} products`,
      lastAggregated: now.toISOString(),
    });

  } catch (error: unknown) {
    console.error('[API /bork/v2/products/aggregate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to aggregate products',
        productsAggregated: 0,
      },
      { status: 500 }
    );
  }
}

