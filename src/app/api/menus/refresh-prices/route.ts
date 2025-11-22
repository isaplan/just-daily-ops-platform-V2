/**
 * POST /api/menus/refresh-prices
 * 
 * Refresh all menu product prices from products_aggregated collection
 * Updates products that have price = 0 with prices from aggregated data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Get all menus
    const menus = await db.collection('menus').find({}).toArray();
    
    let totalUpdated = 0;
    let menusUpdated = 0;
    
    // ✅ OPTIMIZATION: Batch fetch all products_aggregated data to avoid N+1 queries
    const allProductNames = new Set<string>();
    const menuProductMap = new Map<string, Array<{ menu: any; index: number; productPrice: any }>>();
    
    // Collect all product names that need prices
    for (const menu of menus) {
      if (!menu.productPrices || !Array.isArray(menu.productPrices)) continue;
      
      for (let i = 0; i < menu.productPrices.length; i++) {
        const productPrice = menu.productPrices[i];
        if (productPrice.dateRemoved || productPrice.price > 0) continue;
        
        allProductNames.add(productPrice.productName);
        const key = `${menu._id.toString()}_${i}`;
        if (!menuProductMap.has(productPrice.productName)) {
          menuProductMap.set(productPrice.productName, []);
        }
        menuProductMap.get(productPrice.productName)!.push({
          menu,
          index: i,
          productPrice,
        });
      }
    }
    
    // ✅ Batch fetch all products_aggregated in one query
    const aggregatedProducts = await db.collection('products_aggregated').find({
      productName: { $in: Array.from(allProductNames) },
    }).toArray();
    
    // Create lookup map: productName_locationId -> price
    const priceMap = new Map<string, number>();
    for (const agg of aggregatedProducts) {
      const locationKey = agg.locationId?.toString() || 'null';
      const key = `${agg.productName}_${locationKey}`;
      const price = agg.latestPrice > 0 ? agg.latestPrice : (agg.averagePrice > 0 ? agg.averagePrice : 0);
      if (price > 0) {
        priceMap.set(key, price);
      }
    }
    
    // Update menus with prices
    for (const menu of menus) {
      if (!menu.productPrices || !Array.isArray(menu.productPrices)) continue;
      
      const updatedProductPrices = [...menu.productPrices];
      let menuUpdated = false;
      const menuLocationId = menu.locationId 
        ? (menu.locationId instanceof ObjectId ? menu.locationId.toString() : menu.locationId.toString())
        : 'null';
      
      for (let i = 0; i < updatedProductPrices.length; i++) {
        const productPrice = updatedProductPrices[i];
        if (productPrice.dateRemoved || productPrice.price > 0) continue;
        
        // Try location-specific first, then global
        const locationKey = `${productPrice.productName}_${menuLocationId}`;
        const globalKey = `${productPrice.productName}_null`;
        const priceToUse = priceMap.get(locationKey) || priceMap.get(globalKey);
        
        if (priceToUse && priceToUse > 0) {
          updatedProductPrices[i] = {
            ...productPrice,
            price: Math.round(priceToUse * 100) / 100,
          };
          menuUpdated = true;
          totalUpdated++;
        }
      }
      
      // Update menu if prices were updated
      if (menuUpdated) {
        const allProductIds = updatedProductPrices
          .filter(p => !p.dateRemoved)
          .map(p => p.productName)
          .sort();
        
        await db.collection('menus').updateOne(
          { _id: menu._id },
          {
            $set: {
              productIds: allProductIds,
              productPrices: updatedProductPrices,
              updatedAt: new Date(),
            },
          }
        );
        menusUpdated++;
      }
    }
    
    return NextResponse.json({
      success: true,
      menusUpdated,
      productsUpdated: totalUpdated,
      message: `Updated ${totalUpdated} product prices across ${menusUpdated} menus`,
    });
    
  } catch (error: unknown) {
    console.error('[API /menus/refresh-prices] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh prices',
      },
      { status: 500 }
    );
  }
}

