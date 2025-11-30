/**
 * POST /api/bork/v2/aggregate
 * 
 * Aggregate Bork raw data into aggregated records
 * 
 * Body:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - locationId: ObjectId (optional) - filter by location
 * 
 * Returns: { success: boolean, recordsAggregated: number, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { getWorkingDay } from '@/lib/utils/working-day';

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

/**
 * Helper function to map category to division (Food/Beverage)
 * Food = Keuken categories, Beverage = Bar categories
 */
function getDivisionFromCategory(category: string): 'Food' | 'Beverage' | null {
  if (!category) return null;
  
  const lower = category.toLowerCase();
  
  // Bar/Beverage categories
  if (
    lower.includes('bar') ||
    lower.includes('drink') ||
    lower.includes('beverage') ||
    lower.includes('bier') ||
    lower.includes('wijn') ||
    lower.includes('cocktail') ||
    lower.includes('spirit') ||
    lower.includes('frisdrank') ||
    lower.includes('koffie') ||
    lower.includes('thee') ||
    lower.includes('drank') ||
    lower.includes('dranken') ||
    lower.includes('alcohol')
  ) {
    return 'Beverage';
  }
  
  // Keuken/Food categories
  if (
    lower.includes('keuken') ||
    lower.includes('kitchen') ||
    lower.includes('food') ||
    lower.includes('lunch') ||
    lower.includes('diner') ||
    lower.includes('gerecht') ||
    lower.includes('voorgerecht') ||
    lower.includes('hoofdgerecht') ||
    lower.includes('nagerecht') ||
    lower.includes('bijgerecht') ||
    lower.includes('snack') ||
    lower.includes('brood') ||
    lower.includes('eten')
  ) {
    return 'Food';
  }
  
  return null;
}

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
    end.setHours(23, 59, 59, 999); // End of day

    // Build query
    const query: any = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    if (locationId) {
      try {
        query.locationId = new ObjectId(locationId);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid locationId format' },
          { status: 400 }
        );
      }
    }

    // Fetch raw data
    const rawData = await db.collection('bork_raw_data')
      .find(query)
      .toArray();

    if (rawData.length === 0) {
      return NextResponse.json({
        success: true,
        recordsAggregated: 0,
        message: 'No raw data found to aggregate',
      });
    }

    // Group by locationId and date, then aggregate
    const grouped = new Map<string, {
      locationId: ObjectId;
      date: Date;
      tickets: any[];
      totalRevenue: number;
      totalQuantity: number;
      totalTransactions: number;
      revenueByCategory: Record<string, number>;
      revenueByPaymentMethod: Record<string, number>;
      // Breakdown maps for detailed analysis
      paymentMethodMap: Map<string, { revenue: number; transactions: Set<string> }>;
      waiterMap: Map<string, { revenue: number; items: number; transactions: Set<string> }>;
      tableMap: Map<string, { revenue: number; items: number; transactions: Set<string> }>;
      hourlyMap: Map<string, { revenue: number; items: number; transactions: Set<string> }>;
      // Hourly breakdowns for productivity calculations
      workerHourlyMap: Map<string, { revenue: number; items: number; transactions: Set<string>; orders: Set<string> }>;
      divisionHourlyMap: Map<string, { revenue: number; items: number; transactions: Set<string> }>;
    }>();

    for (const record of rawData) {
      if (!record.locationId || !record.date) continue;

      // Apply working day logic: convert calendar date to working day date
      // This ensures revenue is grouped by working day (06:00-05:59:59) not calendar day
      const workingDayStr = await getWorkingDay(record.date);
      const key = `${record.locationId.toString()}_${workingDayStr}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          locationId: record.locationId,
          date: new Date(workingDayStr + 'T00:00:00.000Z'), // Working day date
          tickets: [],
          totalRevenue: 0,
          totalQuantity: 0,
          totalTransactions: 0,
          revenueByCategory: {},
          revenueByPaymentMethod: {},
          paymentMethodMap: new Map(),
          waiterMap: new Map(),
          tableMap: new Map(),
          hourlyMap: new Map(),
          workerHourlyMap: new Map(),
          divisionHourlyMap: new Map(),
        });
      }

      const group = grouped.get(key)!;
      
      // Extract tickets from rawApiResponse
      let tickets: any[] = [];
      if (Array.isArray(record.rawApiResponse)) {
        tickets = record.rawApiResponse;
      } else if (record.rawApiResponse && typeof record.rawApiResponse === 'object') {
        const response = record.rawApiResponse as any;
        if (response.Tickets && Array.isArray(response.Tickets)) {
          tickets = response.Tickets;
        } else if (response.tickets && Array.isArray(response.tickets)) {
          tickets = response.tickets;
        } else {
          tickets = [record.rawApiResponse];
        }
      }
      group.tickets.push(...tickets);

      // Process each ticket with order lines for detailed breakdowns
      for (const ticket of tickets) {
        const ticketKey = `${ticket.TicketNumber || ticket.ticketNumber || ''}_${workingDayStr}`;
        const ticketPayment = ticket.PaymentMethod || ticket.paymentMethod || 'Unknown';
        const ticketTable = ticket.TableNumber || ticket.tableNumber || ticket.TableName || ticket.tableName || null;
        const ticketWaiter = ticket.WaiterName || ticket.waiterName || ticket.UserName || ticket.userName || null;
        const ticketTime = ticket.Time || ticket.time || null;
        
        // Extract hour from time
        let hour: number | null = null;
        if (ticketTime) {
          const timeMatch = String(ticketTime).match(/^(\d{1,2}):/);
          if (timeMatch) {
            hour = parseInt(timeMatch[1], 10);
          }
        }

            const orders = ticket.Orders || ticket.orders || [];
            let ticketRevenue = 0;
            let ticketItems = 0;
            
            // Get locationIdStr early (needed for division hourly tracking)
            const locationIdStr = record.locationId.toString();

            // Process order lines for detailed breakdowns
            if (Array.isArray(orders) && orders.length > 0) {
              for (const order of orders) {
                if (!order || typeof order !== 'object') continue;
                const orderLines = order.Lines || order.lines || [];
                if (!Array.isArray(orderLines) || orderLines.length === 0) continue;

                const orderTable = order.TableNr || order.tableNr || order.TableNumber || order.tableNumber || ticketTable;
                const orderWaiter = order.UserName || order.userName || order.WaiterName || order.waiterName || ticketWaiter;
                const orderTime = order.Time || order.time || ticketTime;
                if (orderTime && !hour) {
                  const timeMatch = String(orderTime).match(/^(\d{1,2}):/);
                  if (timeMatch) {
                    hour = parseInt(timeMatch[1], 10);
                  }
                }

            orderLines.forEach((line: any) => {
              if (!line || typeof line !== 'object') return;
              
              const revenue = line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? 0;
              const quantity = line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 0;
              const category = line.GroupName || line.groupName || line.Category || line.category || 'Unknown';
              
              ticketRevenue += typeof revenue === 'number' ? revenue : 0;
              ticketItems += typeof quantity === 'number' ? quantity : 0;
              group.totalRevenue += typeof revenue === 'number' ? revenue : 0;
              group.totalQuantity += typeof quantity === 'number' ? quantity : 0;

              // Group by category
              if (!group.revenueByCategory[category]) {
                group.revenueByCategory[category] = 0;
              }
              group.revenueByCategory[category] += revenue;
              
              // Track division hourly breakdown (Food/Beverage)
              if (hour != null) {
                const division = getDivisionFromCategory(category);
                if (division) {
                  const divisionHourKey = `${division}_${hour}_${locationIdStr}`;
                  if (!group.divisionHourlyMap.has(divisionHourKey)) {
                    group.divisionHourlyMap.set(divisionHourKey, { revenue: 0, items: 0, transactions: new Set() });
                  }
                  const divisionHourData = group.divisionHourlyMap.get(divisionHourKey)!;
                  divisionHourData.revenue += typeof revenue === 'number' ? revenue : 0;
                  divisionHourData.items += typeof quantity === 'number' ? quantity : 0;
                  divisionHourData.transactions.add(ticketKey);
                }
              }
            });

            // Update breakdown maps
            
            // Payment method breakdown
            const paymentKey = `${ticketPayment}_${locationIdStr}`;
            if (!group.paymentMethodMap.has(paymentKey)) {
              group.paymentMethodMap.set(paymentKey, { revenue: 0, transactions: new Set() });
            }
            const paymentData = group.paymentMethodMap.get(paymentKey)!;
            paymentData.revenue += ticketRevenue;
            paymentData.transactions.add(ticketKey);

            // Waiter breakdown
            if (orderWaiter) {
              const waiterKey = `${orderWaiter}_${locationIdStr}`;
              if (!group.waiterMap.has(waiterKey)) {
                group.waiterMap.set(waiterKey, { revenue: 0, items: 0, transactions: new Set() });
              }
              const waiterData = group.waiterMap.get(waiterKey)!;
              waiterData.revenue += ticketRevenue;
              waiterData.items += ticketItems;
              waiterData.transactions.add(ticketKey);
              
              // Track worker hourly breakdown (per waiter, per hour)
              if (hour != null) {
                const workerHourKey = `${orderWaiter}_${hour}_${locationIdStr}`;
                if (!group.workerHourlyMap.has(workerHourKey)) {
                  group.workerHourlyMap.set(workerHourKey, { revenue: 0, items: 0, transactions: new Set(), orders: new Set() });
                }
                const workerHourData = group.workerHourlyMap.get(workerHourKey)!;
                workerHourData.revenue += ticketRevenue;
                workerHourData.items += ticketItems;
                workerHourData.transactions.add(ticketKey);
                workerHourData.orders.add(ticketKey); // Track unique orders
              }
            }

            // Table breakdown
            if (orderTable != null) {
              const tableNum = typeof orderTable === 'number' ? orderTable : parseInt(String(orderTable), 10);
              if (!isNaN(tableNum)) {
                const tableKey = `${tableNum}_${locationIdStr}`;
                if (!group.tableMap.has(tableKey)) {
                  group.tableMap.set(tableKey, { revenue: 0, items: 0, transactions: new Set() });
                }
                const tableData = group.tableMap.get(tableKey)!;
                tableData.revenue += ticketRevenue;
                tableData.items += ticketItems;
                tableData.transactions.add(ticketKey);
              }
            }

            // Hourly breakdown
            if (hour != null) {
              const hourKey = `${hour}_${locationIdStr}`;
              if (!group.hourlyMap.has(hourKey)) {
                group.hourlyMap.set(hourKey, { revenue: 0, items: 0, transactions: new Set() });
              }
              const hourData = group.hourlyMap.get(hourKey)!;
              hourData.revenue += ticketRevenue;
              hourData.items += ticketItems;
              hourData.transactions.add(ticketKey);
            }
          }
        }

        // Group by payment method (legacy - for backward compatibility)
        if (!group.revenueByPaymentMethod[ticketPayment]) {
          group.revenueByPaymentMethod[ticketPayment] = 0;
        }
        group.revenueByPaymentMethod[ticketPayment] += ticketRevenue;

        // Count transactions
        group.totalTransactions += 1;
      }
    }

    // Get location names for denormalization (query ONCE during aggregation)
    const locationIds = new Set<string>();
    grouped.forEach((group) => {
      locationIds.add(group.locationId.toString());
    });
    
    const locationMap = new Map<string, string>();
    if (locationIds.size > 0) {
      const locationObjectIds = Array.from(locationIds)
        .map(id => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);

      if (locationObjectIds.length > 0) {
        const locations = await db.collection('locations')
          .find({ _id: { $in: locationObjectIds } })
          .toArray() as Array<{ _id?: ObjectId; name?: string }>;

        locations.forEach((loc) => {
          if (loc._id) {
            locationMap.set(loc._id.toString(), loc.name || 'Unknown');
          }
        });
      }
    }

    // Create aggregated records with breakdown arrays
    const aggregatedRecords = Array.from(grouped.values()).map((group) => {
      const avgRevenuePerTransaction = group.totalTransactions > 0
        ? Math.round((group.totalRevenue / group.totalTransactions) * 100) / 100
        : 0;

      // Calculate total revenue for percentage calculations
      const totalRevenue = Math.round(group.totalRevenue * 100) / 100;
      
      // Get location name (denormalized)
      const locationName = locationMap.get(group.locationId.toString()) || 'Unknown';

      // Build breakdown arrays
      const paymentMethodBreakdown = Array.from(group.paymentMethodMap.entries()).map(([key, data]) => {
        const [paymentMethod, locationIdStr] = key.split('_');
        return {
          paymentMethod,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          totalTransactions: data.transactions.size,
          averageTransactionValue: data.transactions.size > 0
            ? Math.round((data.revenue / data.transactions.size) * 100) / 100
            : 0,
          percentageOfTotal: totalRevenue > 0
            ? Math.round((data.revenue / totalRevenue) * 10000) / 100
            : 0,
        };
      });

      const waiterBreakdown = Array.from(group.waiterMap.entries()).map(([key, data]) => {
        const [waiterName, locationIdStr] = key.split('_');
        return {
          waiterName,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          totalItemsSold: Math.round(data.items * 100) / 100,
          totalTransactions: data.transactions.size,
          averageTicketValue: data.transactions.size > 0
            ? Math.round((data.revenue / data.transactions.size) * 100) / 100
            : 0,
          averageItemsPerTransaction: data.transactions.size > 0
            ? Math.round((data.items / data.transactions.size) * 100) / 100
            : 0,
        };
      });

      const tableBreakdown = Array.from(group.tableMap.entries()).map(([key, data]) => {
        const [tableNumStr, locationIdStr] = key.split('_');
        const tableNumber = parseInt(tableNumStr, 10);
        return {
          tableNumber,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          totalItemsSold: Math.round(data.items * 100) / 100,
          totalTransactions: data.transactions.size,
          averageTransactionValue: data.transactions.size > 0
            ? Math.round((data.revenue / data.transactions.size) * 100) / 100
            : 0,
        };
      });

      const hourlyBreakdown = Array.from(group.hourlyMap.entries()).map(([key, data]) => {
        const [hourStr, locationIdStr] = key.split('_');
        const hour = parseInt(hourStr, 10);
        return {
          hour,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          totalItemsSold: Math.round(data.items * 100) / 100,
          totalTransactions: data.transactions.size,
          averageTransactionValue: data.transactions.size > 0
            ? Math.round((data.revenue / data.transactions.size) * 100) / 100
            : 0,
        };
      });

      // Build worker hourly breakdown (per waiter, per hour)
      const workerBreakdownHourly = Array.from(group.workerHourlyMap.entries()).map(([key, data]) => {
        const [waiterName, hourStr, locationIdStr] = key.split('_');
        const hour = parseInt(hourStr, 10);
        return {
          waiterName,
          hour,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          totalItemsSold: Math.round(data.items * 100) / 100,
          totalTransactions: data.transactions.size,
          totalOrders: data.orders.size,
          averageTransactionValue: data.transactions.size > 0
            ? Math.round((data.revenue / data.transactions.size) * 100) / 100
            : 0,
        };
      });

      // Build division hourly breakdown (Food/Beverage per hour)
      const divisionHourlyBreakdown = Array.from(group.divisionHourlyMap.entries()).map(([key, data]) => {
        const [division, hourStr, locationIdStr] = key.split('_');
        const hour = parseInt(hourStr, 10);
        return {
          division: division as 'Food' | 'Beverage',
          hour,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          totalItemsSold: Math.round(data.items * 100) / 100,
          totalTransactions: data.transactions.size,
          averageTransactionValue: data.transactions.size > 0
            ? Math.round((data.revenue / data.transactions.size) * 100) / 100
            : 0,
        };
      });

      return {
        locationId: group.locationId,
        locationName, // ✅ Pre-computed during aggregation (denormalized)
        date: group.date,
        totalRevenue,
        totalQuantity: group.totalQuantity,
        totalTransactions: group.totalTransactions,
        avgRevenuePerTransaction,
        revenueByCategory: group.revenueByCategory,
        revenueByPaymentMethod: group.revenueByPaymentMethod,
        paymentMethodBreakdown: paymentMethodBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue),
        waiterBreakdown: waiterBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue),
        tableBreakdown: tableBreakdown.sort((a, b) => b.totalRevenue - a.totalRevenue),
        hourlyBreakdown: hourlyBreakdown.sort((a, b) => a.hour - b.hour),
        workerBreakdownHourly: workerBreakdownHourly.sort((a, b) => {
          // Sort by hour first, then by waiter name
          if (a.hour !== b.hour) return a.hour - b.hour;
          return a.waiterName.localeCompare(b.waiterName);
        }),
        divisionHourlyBreakdown: divisionHourlyBreakdown.sort((a, b) => {
          // Sort by hour first, then by division
          if (a.hour !== b.hour) return a.hour - b.hour;
          return a.division.localeCompare(b.division);
        }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    // Upsert aggregated records
    let recordsAggregated = 0;
    if (aggregatedRecords.length > 0) {
      const operations = aggregatedRecords.map((record) => ({
        updateOne: {
          filter: {
            locationId: record.locationId,
            date: record.date,
          },
          update: { $set: record },
          upsert: true,
        },
      }));

      const result = await db.collection('bork_aggregated').bulkWrite(operations);
      recordsAggregated = result.upsertedCount + result.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      recordsAggregated,
      message: `Successfully aggregated ${recordsAggregated} records`,
    });

  } catch (error: any) {
    console.error('[API /bork/v2/aggregate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to aggregate data',
        recordsAggregated: 0,
      },
      { status: 500 }
    );
  }
}


