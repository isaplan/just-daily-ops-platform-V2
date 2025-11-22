/**
 * Migration: products → products_aggregated
 * 
 * Migrates existing products collection to products_aggregated collection
 * with enriched fields initialized to default values
 */

import { getDatabase } from '../v2-connection';
import { ObjectId } from 'mongodb';

export async function migrateProductsToAggregated(): Promise<{
  migrated: number;
  errors: string[];
}> {
  const db = await getDatabase();
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Get all products from products collection
    const products = await db.collection('products').find({}).toArray();
    
    console.log(`[Migration] Found ${products.length} products to migrate`);

    // Migrate each product
    for (const product of products) {
      try {
        // Check if already exists in products_aggregated
        const existing = await db.collection('products_aggregated').findOne({
          productName: product.productName,
          locationId: null, // Global product (no locationId)
        });

        if (existing) {
          console.log(`[Migration] Product "${product.productName}" already exists in products_aggregated, skipping`);
          continue;
        }

        // Create enriched product document
        const aggregatedProduct = {
          // Basic product info (from products collection)
          productName: product.productName,
          category: product.category || null,
          mainCategory: null, // Will be populated by aggregation service
          productSku: null,
          locationId: null, // Global product (location-specific will be created separately)

          // Workload & MEP (from products collection)
          workloadLevel: product.workloadLevel || 'mid',
          workloadMinutes: product.workloadMinutes || 5,
          mepLevel: product.mepLevel || 'low',
          mepMinutes: product.mepMinutes || 1,
          courseType: product.courseType || null,
          notes: product.notes || null,
          isActive: product.isActive !== undefined ? product.isActive : true,

          // Price information (will be populated by aggregation service)
          averagePrice: 0,
          latestPrice: 0,
          minPrice: 0,
          maxPrice: 0,
          priceHistory: [],

          // Sales statistics (will be populated by aggregation service)
          totalQuantitySold: 0,
          totalRevenue: 0,
          totalTransactions: 0,
          firstSeen: product.createdAt || new Date(),
          lastSeen: product.updatedAt || new Date(),

          // Menu associations (will be populated by aggregation service)
          menuIds: [],
          menuPrices: [],

          // Location details (will be populated by aggregation service)
          locationDetails: [],

          // Time-series sales data (will be populated by aggregation service)
          salesByDate: [],
          salesByWeek: [],
          salesByMonth: [],

          // Metadata
          vatRate: null,
          costPrice: null,

          // Timestamps
          createdAt: product.createdAt || new Date(),
          updatedAt: product.updatedAt || new Date(),
          lastAggregated: null, // Will be set by aggregation service
        };

        // Insert into products_aggregated
        await db.collection('products_aggregated').insertOne(aggregatedProduct);
        migrated++;

        console.log(`[Migration] Migrated product: ${product.productName}`);
      } catch (error: any) {
        const errorMsg = `Failed to migrate product "${product.productName}": ${error.message}`;
        errors.push(errorMsg);
        console.error(`[Migration] ${errorMsg}`);
      }
    }

    console.log(`[Migration] Migration complete: ${migrated} products migrated, ${errors.length} errors`);

    return { migrated, errors };
  } catch (error: any) {
    console.error('[Migration] Fatal error:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateProductsToAggregated()
    .then((result) => {
      console.log('Migration result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

