import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

/**
 * PUT /api/menus/[id]/products/auto-populate
 * Auto-populate products from sales data and add them to the menu
 * Finds all products sold after menu start date for the menu's location and adds them
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid menu ID' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get menu
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(id) });
    
    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    // Get menu date range and location
    const startDate = new Date(menu.startDate);
    const endDate = menu.endDate ? new Date(menu.endDate) : new Date();
    const locationId = menu.locationId;
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Menu has no location assigned. Please assign a location first.' },
        { status: 400 }
      );
    }
    
    const locationObjectId = locationId instanceof ObjectId ? locationId : new ObjectId(locationId);
    
    // ✅ USE PRODUCTS_AGGREGATED COLLECTION (FAST!)
    // Query aggregated products for this location that were seen in the date range
    const aggregatedProducts = await db.collection('products_aggregated')
      .find({
        locationId: locationObjectId,
        lastSeen: { $gte: startDate, $lte: endDate },
      })
      .toArray();
    
    console.log('[Auto-Populate] Using products_aggregated:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      locationId: locationId.toString(),
      productsFound: aggregatedProducts.length,
    });
    
    // If no aggregated products found, try without location filter (global products)
    let productsToUse = aggregatedProducts;
    if (aggregatedProducts.length === 0) {
      console.log('[Auto-Populate] No location-specific products found, trying global products...');
      const globalProducts = await db.collection('products_aggregated')
        .find({
          locationId: null,
          lastSeen: { $gte: startDate, $lte: endDate },
        })
        .limit(1000) // Limit to prevent too many results
        .toArray();
      productsToUse = globalProducts;
      console.log('[Auto-Populate] Found', globalProducts.length, 'global products');
    }
    
    // ✅ Convert aggregated products to menu products format
    const now = new Date();
    const newProducts: Array<{
      productName: string;
      price: number;
      dateAdded: Date;
    }> = productsToUse
      .filter((product: Record<string, unknown>) => product.productName && typeof product.productName === 'string')
      .map((product: Record<string, unknown>) => {
        const productName = product.productName as string;
        const latestPrice = typeof product.latestPrice === 'number' ? product.latestPrice : 0;
        const averagePrice = typeof product.averagePrice === 'number' ? product.averagePrice : 0;
        
        // Use latestPrice if available, otherwise averagePrice, otherwise 0
        const price = latestPrice > 0 ? latestPrice : (averagePrice > 0 ? averagePrice : 0);
        
        return {
          productName,
          price: Math.round(price * 100) / 100, // Round to 2 decimals
          dateAdded: now,
        };
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
    
    console.log('[Auto-Populate] Products from aggregated collection:', {
      totalProductsFound: newProducts.length,
      productsWithPrices: newProducts.filter(p => p.price > 0).length,
      productsWithoutPrices: newProducts.filter(p => p.price === 0).length,
      sampleProducts: newProducts.slice(0, 5).map(p => ({ name: p.productName, price: p.price })),
    });
    
    // Merge with existing products (avoid duplicates, update prices if changed)
    const existingProductPrices = (menu.productPrices || []) as Array<{
      productName: string;
      price: number;
      dateAdded: Date;
      dateRemoved?: Date;
    }>;
    const existingProductMap = new Map(
      existingProductPrices
        .filter(p => !p.dateRemoved) // Only active products
        .map(p => [p.productName, p])
    );
    
    // SAFEGUARD: If no products found in sales data, preserve existing products
    const existingActiveProducts = existingProductPrices.filter(p => !p.dateRemoved);
    if (newProducts.length === 0) {
      console.log('[Auto-Populate] No products found in aggregated collection:', {
        productsQueried: productsToUse.length,
        existingProductsCount: existingActiveProducts.length,
      });
      
      if (existingActiveProducts.length > 0) {
        return NextResponse.json({
          success: true,
          addedProducts: 0,
          updatedProducts: 0,
          existingProducts: existingActiveProducts.length,
          totalProducts: existingActiveProducts.length,
          warning: 'No products found in sales data for the specified date range. Existing products preserved.',
        });
      } else {
        return NextResponse.json({
          success: true,
          addedProducts: 0,
          updatedProducts: 0,
          existingProducts: 0,
          totalProducts: 0,
          warning: 'No products found in sales data and no existing products to preserve.',
        });
      }
    }
    
    console.log('[Auto-Populate] Products found:', {
      newProductsCount: newProducts.length,
      existingProductsCount: existingActiveProducts.length,
    });
    
    // Update existing products or add new ones
    const updatedProductPrices = [...existingProductPrices];
    const addedProducts: string[] = [];
    const updatedProducts: string[] = [];
    
    for (const newProduct of newProducts) {
      const existing = existingProductMap.get(newProduct.productName);
      
      if (!existing) {
        // New product - add it
        updatedProductPrices.push(newProduct);
        addedProducts.push(newProduct.productName);
      } else {
        // Existing product - ALWAYS update price from aggregated data (even if 0, use latest from sales)
        // This ensures prices are refreshed from products_aggregated
        const priceChanged = Math.abs(existing.price - newProduct.price) > 0.01;
        const hasValidPrice = newProduct.price > 0;
        
        // Update if price changed OR if existing price is 0 but we found a valid price
        if (priceChanged || (existing.price === 0 && hasValidPrice)) {
          // Mark old entry as removed and add new entry
          const existingIndex = updatedProductPrices.findIndex(
            p => p.productName === newProduct.productName && !p.dateRemoved
          );
          if (existingIndex >= 0) {
            updatedProductPrices[existingIndex] = {
              ...updatedProductPrices[existingIndex],
              dateRemoved: now,
            };
          }
          updatedProductPrices.push(newProduct);
          updatedProducts.push(newProduct.productName);
        }
      }
    }
    
    // ✅ Also update products that exist in menu but weren't in aggregated results
    // (in case they have prices in products_aggregated but weren't in date range)
    for (const existingProduct of existingProductPrices) {
      if (existingProduct.dateRemoved) continue;
      
      // If existing product has price 0, try to find price from products_aggregated
      if (existingProduct.price === 0) {
        const aggregatedProduct = await db.collection('products_aggregated').findOne({
          productName: existingProduct.productName,
          $or: [
            { locationId: locationObjectId },
            { locationId: null }, // Global product
          ],
        });
        
        if (aggregatedProduct && aggregatedProduct.latestPrice > 0) {
          const priceToUse = aggregatedProduct.latestPrice > 0 
            ? aggregatedProduct.latestPrice 
            : (aggregatedProduct.averagePrice > 0 ? aggregatedProduct.averagePrice : 0);
          
          if (priceToUse > 0) {
            // Update existing product price
            const existingIndex = updatedProductPrices.findIndex(
              p => p.productName === existingProduct.productName && !p.dateRemoved
            );
            if (existingIndex >= 0) {
              updatedProductPrices[existingIndex] = {
                ...updatedProductPrices[existingIndex],
                dateRemoved: now,
              };
              updatedProductPrices.push({
                productName: existingProduct.productName,
                price: Math.round(priceToUse * 100) / 100,
                dateAdded: now,
              });
              updatedProducts.push(existingProduct.productName);
            }
          }
        }
      }
    }
    
    // Also update productIds array for backward compatibility
    // SAFEGUARD: Always preserve existing active products, even if no new products found
    const allProductIds = updatedProductPrices
      .filter(p => !p.dateRemoved)
      .map(p => p.productName)
      .sort();
    
    // Update menu with all products and prices
    const result = await db.collection('menus').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          productIds: allProductIds, // Backward compatibility
          productPrices: updatedProductPrices, // New structure with prices
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      addedProducts: addedProducts.length,
      updatedProducts: updatedProducts.length,
      existingProducts: existingProductPrices.filter(p => !p.dateRemoved).length,
      totalProducts: allProductIds.length,
      newProducts: addedProducts,
      priceUpdatedProducts: updatedProducts,
    });
  } catch (error) {
    console.error('[API] Error auto-populating products:', error);
    return NextResponse.json(
      { error: 'Failed to auto-populate products' },
      { status: 500 }
    );
  }
}

