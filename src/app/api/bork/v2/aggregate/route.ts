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

export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs';

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
    }>();

    for (const record of rawData) {
      if (!record.locationId || !record.date) continue;

      const key = `${record.locationId.toString()}_${record.date.toISOString().split('T')[0]}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          locationId: record.locationId,
          date: new Date(record.date),
          tickets: [],
          totalRevenue: 0,
          totalQuantity: 0,
          totalTransactions: 0,
          revenueByCategory: {},
          revenueByPaymentMethod: {},
        });
      }

      const group = grouped.get(key)!;
      
      // Extract tickets from rawApiResponse
      const tickets = Array.isArray(record.rawApiResponse) ? record.rawApiResponse : [];
      group.tickets.push(...tickets);

      // Process each ticket
      for (const ticket of tickets) {
        // Calculate revenue (prefer RevenueIncVat, fallback to Revenue, then TotalPrice)
        const revenue = ticket.RevenueIncVat || ticket.Revenue || ticket.TotalPrice || 0;
        group.totalRevenue += typeof revenue === 'number' ? revenue : 0;

        // Calculate quantity
        const quantity = ticket.Quantity || 0;
        group.totalQuantity += typeof quantity === 'number' ? quantity : 0;

        // Count transactions (each ticket is a transaction)
        group.totalTransactions += 1;

        // Group by category
        const category = ticket.Category || 'Unknown';
        if (!group.revenueByCategory[category]) {
          group.revenueByCategory[category] = 0;
        }
        group.revenueByCategory[category] += revenue;

        // Group by payment method
        const paymentMethod = ticket.PaymentMethod || 'Unknown';
        if (!group.revenueByPaymentMethod[paymentMethod]) {
          group.revenueByPaymentMethod[paymentMethod] = 0;
        }
        group.revenueByPaymentMethod[paymentMethod] += revenue;
      }
    }

    // Create aggregated records
    const aggregatedRecords = Array.from(grouped.values()).map((group) => {
      const avgRevenuePerTransaction = group.totalTransactions > 0
        ? Math.round((group.totalRevenue / group.totalTransactions) * 100) / 100
        : 0;

      return {
        locationId: group.locationId,
        date: group.date,
        totalRevenue: Math.round(group.totalRevenue * 100) / 100,
        totalQuantity: group.totalQuantity,
        totalTransactions: group.totalTransactions,
        avgRevenuePerTransaction,
        revenueByCategory: group.revenueByCategory,
        revenueByPaymentMethod: group.revenueByPaymentMethod,
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


