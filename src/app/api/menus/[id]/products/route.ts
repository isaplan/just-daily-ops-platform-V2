import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';


/**
 * POST /api/menus/[id]/products
 * Assign products to a menu
 */
export async function POST(
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
    
    const body = await request.json();
    const { productIds, productPrices } = body; // productPrices is optional: Array<{productName: string, price: number}>
    
    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds must be an array' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get menu to check location and date range for price lookup
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(id) });
    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    // Verify products exist
    const products = await db
      .collection('products')
      .find({ productName: { $in: productIds } })
      .toArray();
    
    const foundProductNames = products.map((p) => p.productName);
    const notFoundProducts = productIds.filter((name) => !foundProductNames.includes(name));
    
    if (notFoundProducts.length > 0) {
      return NextResponse.json(
        {
          error: `Products not found: ${notFoundProducts.join(', ')}`,
        },
        { status: 400 }
      );
    }
    
    // Build productPrices array - use provided prices or fetch from sales data
    const now = new Date();
    const menuProductPrices: Array<{
      productName: string;
      price: number;
      dateAdded: Date;
    }> = [];
    
    // If productPrices provided, use them
    if (productPrices && Array.isArray(productPrices)) {
      for (const pp of productPrices) {
        if (productIds.includes(pp.productName)) {
          menuProductPrices.push({
            productName: pp.productName,
            price: pp.price,
            dateAdded: now,
          });
        }
      }
    }
    
    // For products without prices, try to get from sales data
    const productsNeedingPrices = productIds.filter(
      name => !menuProductPrices.find(p => p.productName === name)
    );
    
    if (productsNeedingPrices.length > 0 && menu.locationId) {
      // Fetch latest prices from sales data
      const startDate = new Date(menu.startDate);
      const endDate = menu.endDate ? new Date(menu.endDate) : new Date();
      
      const query: any = {
        date: {
          $gte: startDate,
          $lte: endDate,
        },
        locationId: menu.locationId instanceof ObjectId ? menu.locationId : new ObjectId(menu.locationId),
      };
      
      const recentSales = await db.collection('bork_raw_data')
        .find(query)
        .sort({ date: -1 })
        .limit(1000)
        .toArray();
      
      // Extract prices for missing products
      const priceMap = new Map<string, number>();
      
      for (const record of recentSales) {
        const rawApiResponse = record.rawApiResponse;
        if (!rawApiResponse) continue;
        
        const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : [rawApiResponse];
        
        for (const ticket of tickets) {
          if (!ticket || typeof ticket !== 'object') continue;
          const orders = ticket.Orders || ticket.orders || [];
          
          for (const order of Array.isArray(orders) ? orders : []) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            
            for (const line of Array.isArray(orderLines) ? orderLines : []) {
              if (!line || typeof line !== 'object') continue;
              
              const lineProductName = line.ProductName || line.productName || line.Name || line.name;
              const linePrice = line.UnitPrice || line.unitPrice || line.Price || line.price || 
                               line.TotalExVat || line.totalExVat || 
                               (line.TotalIncVat || line.totalIncVat) ? 
                                 ((line.TotalIncVat || line.totalIncVat) / (1 + ((line.VatRate || line.vatRate || 0) / 100))) : null;
              
              if (lineProductName && productsNeedingPrices.includes(lineProductName.trim()) && 
                  linePrice && typeof linePrice === 'number' && linePrice > 0 && !priceMap.has(lineProductName.trim())) {
                priceMap.set(lineProductName.trim(), linePrice);
              }
            }
          }
        }
      }
      
      // Add products with found prices, or default to 0 if not found
      for (const productName of productsNeedingPrices) {
        menuProductPrices.push({
          productName,
          price: priceMap.get(productName) || 0,
          dateAdded: now,
        });
      }
    } else {
      // No location or no products needing prices - set price to 0
      for (const productName of productsNeedingPrices) {
        menuProductPrices.push({
          productName,
          price: 0,
          dateAdded: now,
        });
      }
    }
    
    // Get existing productPrices to preserve history
    const existingProductPrices = (menu.productPrices || []) as Array<{
      productName: string;
      price: number;
      dateAdded: Date;
      dateRemoved?: Date;
    }>;
    
    // Mark removed products
    const existingProductNames = new Set(menuProductPrices.map(p => p.productName));
    const updatedProductPrices = existingProductPrices.map(p => {
      if (!existingProductNames.has(p.productName) && !p.dateRemoved) {
        return { ...p, dateRemoved: now };
      }
      return p;
    });
    
    // Add new/updated products
    for (const newProduct of menuProductPrices) {
      const existingIndex = updatedProductPrices.findIndex(
        p => p.productName === newProduct.productName && !p.dateRemoved
      );
      
      if (existingIndex >= 0) {
        // Check if price changed
        const existing = updatedProductPrices[existingIndex];
        if (Math.abs(existing.price - newProduct.price) > 0.01) {
          // Price changed - mark old as removed, add new
          updatedProductPrices[existingIndex] = { ...existing, dateRemoved: now };
          updatedProductPrices.push(newProduct);
        }
      } else {
        // New product
        updatedProductPrices.push(newProduct);
      }
    }
    
    // Update menu
    const result = await db.collection('menus').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          productIds,
          productPrices: updatedProductPrices,
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
      modified: result.modifiedCount,
      assignedProducts: productIds.length,
    });
  } catch (error) {
    console.error('[API] Error assigning products to menu:', error);
    return NextResponse.json(
      { error: 'Failed to assign products' },
      { status: 500 }
    );
  }
}


/**
 * DELETE /api/menus/[id]/products
 * Remove products from a menu
 */
export async function DELETE(
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
    
    const body = await request.json();
    const { productIds } = body;
    
    if (!Array.isArray(productIds)) {
      return NextResponse.json(
        { error: 'productIds must be an array' },
        { status: 400 }
      );
    }
    
    const db = await getDatabase();
    
    // Get menu to update productPrices
    const menu = await db.collection('menus').findOne({ _id: new ObjectId(id) });
    if (!menu) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }
    
    // Mark products as removed in productPrices
    const existingProductPrices = (menu.productPrices || []) as Array<{
      productName: string;
      price: number;
      dateAdded: Date;
      dateRemoved?: Date;
    }>;
    
    const now = new Date();
    const updatedProductPrices = existingProductPrices.map(p => {
      if (productIds.includes(p.productName) && !p.dateRemoved) {
        return { ...p, dateRemoved: now };
      }
      return p;
    });
    
    // Also remove from productIds array
    const updatedProductIds = (menu.productIds || []).filter(
      (id: string) => !productIds.includes(id)
    );
    
    const result = await db.collection('menus').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          productIds: updatedProductIds,
          productPrices: updatedProductPrices,
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
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error('[API] Error removing products from menu:', error);
    return NextResponse.json(
      { error: 'Failed to remove products' },
      { status: 500 }
    );
  }
}

