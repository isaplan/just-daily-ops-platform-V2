/**
 * Division Revenue Service
 * Calculates revenue by division (Food/Beverage) from products_aggregated
 * Food = products with mainCategory: 'Keuken'
 * Beverage = products with mainCategory: 'Bar'
 */

import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export type Division = 'Food' | 'Beverage' | 'Management' | 'Other' | 'All';

/**
 * Calculate division revenue for a specific date and location
 */
export async function calculateDivisionRevenueForDate(
  locationId: string,
  date: Date | string,
  division: Division
): Promise<number> {
  const db = await getDatabase();
  const locationObjId = new ObjectId(locationId);
  
  // Convert date to Date object if string
  const dateObj = date instanceof Date ? date : new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0];
  
  if (division === 'All') {
    // For total, use aggregated sales data from bork_aggregated
    const salesRecord = await db.collection('bork_aggregated')
      .findOne({
        locationId: locationObjId,
        date: dateObj,
      });
    
    return salesRecord?.totalRevenue || 0;
  }
  
  // For Food/Beverage, query products_aggregated by mainCategory
  const mainCategory = division === 'Food' ? 'Keuken' : 'Bar';
  
  // Query products with the specified mainCategory (both global and location-specific)
  const products = await db.collection('products_aggregated')
    .find({
      mainCategory,
      $or: [
        { locationId: locationObjId },
        { locationId: null }, // Global products
      ],
    })
    .toArray();
  
  // Sum revenue from salesByDate filtered by date
  let totalRevenue = 0;
  
  for (const product of products) {
    // Check locationDetails first (location-specific sales data)
    if (product.locationDetails && Array.isArray(product.locationDetails)) {
      const locationDetail = product.locationDetails.find((ld: any) => 
        ld.locationId && ld.locationId.toString() === locationId
      );
      
      if (locationDetail) {
        // For location-specific products, check if we have date-filtered data
        // If not available, use totalRevenue (approximation)
        if (product.salesByDate && Array.isArray(product.salesByDate)) {
          const filteredSales = product.salesByDate.filter((sale: any) => {
            const saleDate = sale.date instanceof Date 
              ? sale.date.toISOString().split('T')[0]
              : sale.date;
            return saleDate === dateStr;
          });
          
          totalRevenue += filteredSales.reduce(
            (sum: number, sale: any) => sum + (sale.revenueIncVat || 0),
            0
          );
        } else {
          // Fallback: use locationDetail.totalRevenue divided by number of days
          // This is an approximation - ideally we'd have daily breakdown
          totalRevenue += (locationDetail.totalRevenue || 0) / 365; // Rough daily average
        }
        continue;
      }
    }
    
    // Fallback to salesByDate (filter by date range)
    if (product.salesByDate && Array.isArray(product.salesByDate)) {
      const filteredSales = product.salesByDate.filter((sale: any) => {
        const saleDate = sale.date instanceof Date 
          ? sale.date.toISOString().split('T')[0]
          : sale.date;
        return saleDate === dateStr;
      });
      
      // For global products, we need to check if sales are for this location
      // For now, we'll use all sales (can be enhanced later with location filtering in salesByDate)
      totalRevenue += filteredSales.reduce(
        (sum: number, sale: any) => sum + (sale.revenueIncVat || 0),
        0
      );
    }
  }
  
  return totalRevenue;
}

/**
 * Calculate division revenue for a date range
 */
export async function calculateDivisionRevenueForDateRange(
  locationId: string,
  startDate: Date | string,
  endDate: Date | string,
  division: Division
): Promise<number> {
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  let totalRevenue = 0;
  const currentDate = new Date(start);
  
  // Iterate through each day in the range
  while (currentDate <= end) {
    const dayRevenue = await calculateDivisionRevenueForDate(
      locationId,
      new Date(currentDate),
      division
    );
    totalRevenue += dayRevenue;
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return totalRevenue;
}










