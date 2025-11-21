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
    
    for (const menu of menus) {
      if (!menu.productPrices || !Array.isArray(menu.productPrices)) continue;
      
      const updatedProductPrices = [...menu.productPrices];
      let menuUpdated = false;
      
      for (let i = 0; i < updatedProductPrices.length; i++) {
        const productPrice = updatedProductPrices[i];
        if (productPrice.dateRemoved) continue;
        
        // If price is 0, try to find price from products_aggregated
        if (productPrice.price === 0) {
          const locationId = menu.locationId 
            ? (menu.locationId instanceof ObjectId ? menu.locationId : new ObjectId(menu.locationId))
            : null;
          
          // Try location-specific first, then global
          let aggregatedProduct = await db.collection('products_aggregated').findOne({
            productName: productPrice.productName,
            locationId: locationId,
          });
          
          if (!aggregatedProduct && locationId) {
            // Try global product
            aggregatedProduct = await db.collection('products_aggregated').findOne({
              productName: productPrice.productName,
              locationId: null,
            });
          }
          
          if (aggregatedProduct) {
            const priceToUse = aggregatedProduct.latestPrice > 0 
              ? aggregatedProduct.latestPrice 
              : (aggregatedProduct.averagePrice > 0 ? aggregatedProduct.averagePrice : 0);
            
            if (priceToUse > 0) {
              // Update the price
              updatedProductPrices[i] = {
                ...productPrice,
                price: Math.round(priceToUse * 100) / 100,
              };
              menuUpdated = true;
              totalUpdated++;
            }
          }
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

