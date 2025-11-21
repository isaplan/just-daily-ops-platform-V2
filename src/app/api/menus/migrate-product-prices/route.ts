/**
 * POST /api/menus/migrate-product-prices
 * 
 * Migrate menus that have productIds but no productPrices
 * Creates productPrices entries from productIds
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Find menus with productIds but no productPrices (or empty productPrices)
    const menus = await db.collection('menus').find({
      $or: [
        { productIds: { $exists: true, $ne: [] }, productPrices: { $exists: false } },
        { productIds: { $exists: true, $ne: [] }, productPrices: [] },
        { productIds: { $exists: true, $ne: [] }, 'productPrices.0': { $exists: false } },
      ],
    }).toArray();
    
    let menusUpdated = 0;
    let productsMigrated = 0;
    
    for (const menu of menus) {
      if (!menu.productIds || !Array.isArray(menu.productIds) || menu.productIds.length === 0) {
        continue;
      }
      
      // Check if productPrices already exists and has data
      const hasProductPrices = menu.productPrices && Array.isArray(menu.productPrices) && menu.productPrices.length > 0;
      
      if (hasProductPrices) {
        continue; // Skip if already has productPrices
      }
      
      // Create productPrices from productIds
      const now = new Date();
      const productPrices = menu.productIds.map((productName: string) => ({
        productName,
        price: 0, // Default to 0, will be updated by refresh-prices or auto-populate
        dateAdded: menu.startDate || now,
      }));
      
      // Try to get prices from products_aggregated
      const locationId = menu.locationId 
        ? (menu.locationId instanceof ObjectId ? menu.locationId : new ObjectId(menu.locationId))
        : null;
      
      // Fetch prices from products_aggregated
      const aggregatedProducts = await db.collection('products_aggregated').find({
        productName: { $in: menu.productIds },
        $or: [
          { locationId: locationId },
          { locationId: null }, // Global products
        ],
      }).toArray();
      
      // Create a map of product prices
      const priceMap = new Map<string, number>();
      for (const agg of aggregatedProducts) {
        const price = agg.latestPrice > 0 ? agg.latestPrice : (agg.averagePrice > 0 ? agg.averagePrice : 0);
        if (price > 0) {
          priceMap.set(agg.productName, price);
        }
      }
      
      // Update productPrices with found prices
      const updatedProductPrices = productPrices.map(pp => ({
        ...pp,
        price: priceMap.get(pp.productName) || 0,
      }));
      
      // Update menu
      await db.collection('menus').updateOne(
        { _id: menu._id },
        {
          $set: {
            productPrices: updatedProductPrices,
            updatedAt: new Date(),
          },
        }
      );
      
      menusUpdated++;
      productsMigrated += updatedProductPrices.length;
    }
    
    return NextResponse.json({
      success: true,
      menusUpdated,
      productsMigrated,
      message: `Migrated ${productsMigrated} products across ${menusUpdated} menus`,
    });
    
  } catch (error: unknown) {
    console.error('[API /menus/migrate-product-prices] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to migrate product prices',
      },
      { status: 500 }
    );
  }
}

