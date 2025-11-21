import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

/**
 * GET /api/products/[productName]/price-history
 * Get price history for a product across all menus
 * Shows which menus the product was on and what price it had
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productName: string } }
) {
  try {
    const { productName } = params;
    const decodedProductName = decodeURIComponent(productName);
    
    const db = await getDatabase();
    
    // Find all menus that contain this product
    const menus = await db.collection('menus')
      .find({
        $or: [
          { productIds: decodedProductName },
          { 'productPrices.productName': decodedProductName }
        ]
      })
      .sort({ startDate: 1 }) // Sort by start date (chronological)
      .toArray();
    
    // Extract price history
    const priceHistory: Array<{
      menuId: string;
      menuTitle: string;
      locationId?: string;
      locationName?: string;
      startDate: Date;
      endDate: Date;
      price: number;
      dateAdded: Date;
      dateRemoved?: Date;
      priceChange?: {
        previousPrice: number;
        change: number;
        changePercent: number;
      };
    }> = [];
    
    let previousPrice: number | null = null;
    
    for (const menu of menus) {
      // Get price from productPrices array (new structure)
      let productPrice = 0;
      let dateAdded: Date | null = null;
      let dateRemoved: Date | null = null;
      
      if (menu.productPrices && Array.isArray(menu.productPrices)) {
        // Find the most recent active entry (not removed)
        const activeEntry = menu.productPrices
          .filter((p: any) => p.productName === decodedProductName && !p.dateRemoved)
          .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())[0];
        
        if (activeEntry) {
          productPrice = activeEntry.price || 0;
          dateAdded = activeEntry.dateAdded ? new Date(activeEntry.dateAdded) : new Date(menu.startDate);
        } else {
          // Find removed entry (most recent)
          const removedEntry = menu.productPrices
            .filter((p: any) => p.productName === decodedProductName && p.dateRemoved)
            .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())[0];
          
          if (removedEntry) {
            productPrice = removedEntry.price || 0;
            dateAdded = removedEntry.dateAdded ? new Date(removedEntry.dateAdded) : new Date(menu.startDate);
            dateRemoved = removedEntry.dateRemoved ? new Date(removedEntry.dateRemoved) : null;
          }
        }
      }
      
      // If no price found in productPrices, check if product is in productIds (legacy)
      if (productPrice === 0 && menu.productIds && menu.productIds.includes(decodedProductName)) {
        // Try to get price from sales data for this menu period
        if (menu.locationId) {
          const startDate = new Date(menu.startDate);
          const endDate = menu.endDate ? new Date(menu.endDate) : new Date();
          
          const query: any = {
            date: {
              $gte: startDate,
              $lte: endDate,
            },
            locationId: menu.locationId instanceof ObjectId ? menu.locationId : new ObjectId(menu.locationId),
          };
          
          const salesRecord = await db.collection('bork_raw_data')
            .findOne(query);
          
          if (salesRecord?.rawApiResponse) {
            // Extract price from first matching product
            const tickets = Array.isArray(salesRecord.rawApiResponse) ? salesRecord.rawApiResponse : [salesRecord.rawApiResponse];
            
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
                  
                  if (lineProductName?.trim() === decodedProductName && linePrice && typeof linePrice === 'number' && linePrice > 0) {
                    productPrice = linePrice;
                    dateAdded = new Date(menu.startDate);
                    break;
                  }
                }
                if (productPrice > 0) break;
              }
              if (productPrice > 0) break;
            }
          }
        }
      }
      
      // Get location name
      let locationName: string | undefined;
      if (menu.locationId) {
        try {
          const location = await db.collection('locations').findOne({
            _id: menu.locationId instanceof ObjectId ? menu.locationId : new ObjectId(menu.locationId)
          });
          locationName = location?.name;
        } catch (e) {
          // Invalid location ID, skip
        }
      }
      
      // Calculate price change
      let priceChange: {
        previousPrice: number;
        change: number;
        changePercent: number;
      } | undefined;
      
      if (previousPrice !== null && productPrice > 0) {
        const change = productPrice - previousPrice;
        const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
        
        priceChange = {
          previousPrice,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
        };
      }
      
      if (productPrice > 0 || menu.productIds?.includes(decodedProductName)) {
        priceHistory.push({
          menuId: menu._id.toString(),
          menuTitle: menu.title,
          locationId: menu.locationId?.toString(),
          locationName,
          startDate: new Date(menu.startDate),
          endDate: menu.endDate ? new Date(menu.endDate) : new Date(),
          price: productPrice,
          dateAdded: dateAdded || new Date(menu.startDate),
          dateRemoved: dateRemoved || undefined,
          priceChange,
        });
        
        if (productPrice > 0) {
          previousPrice = productPrice;
        }
      }
    }
    
    // Calculate statistics
    const prices = priceHistory.filter(h => h.price > 0).map(h => h.price);
    const stats = {
      totalMenus: priceHistory.length,
      averagePrice: prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      priceChanges: priceHistory.filter(h => h.priceChange).length,
      totalPriceIncrease: priceHistory
        .filter(h => h.priceChange && h.priceChange.change > 0)
        .reduce((sum, h) => sum + (h.priceChange?.change || 0), 0),
      totalPriceDecrease: priceHistory
        .filter(h => h.priceChange && h.priceChange.change < 0)
        .reduce((sum, h) => sum + Math.abs(h.priceChange?.change || 0), 0),
    };
    
    return NextResponse.json({
      success: true,
      productName: decodedProductName,
      priceHistory,
      statistics: stats,
    });
  } catch (error) {
    console.error('[API] Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}

