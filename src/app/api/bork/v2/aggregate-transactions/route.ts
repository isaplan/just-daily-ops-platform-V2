/**
 * POST /api/bork/v2/aggregate-transactions
 * 
 * Aggregate Bork raw data into transactions_aggregated collection
 * Transaction summary level - one record per ticket
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
import { TransactionAggregated } from '@/lib/mongodb/v2-schema';

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
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');

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

    // Get location names
    const locationIds = new Set<string>();
    rawData.forEach((record) => {
      if (record.locationId) {
        locationIds.add(record.locationId.toString());
      }
    });

    const locationMap = new Map<string, { name: string }>();
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
            locationMap.set(loc._id.toString(), {
              name: loc.name || 'Unknown',
            });
          }
        });
      }
    }

    // Extract transactions from raw data (group by ticket_number + date)
    const transactionMap = new Map<string, TransactionAggregated>();

    for (const record of rawData) {
      if (!record.rawApiResponse) continue;

      const locationIdStr = record.locationId?.toString() || '';
      const locationInfo = locationMap.get(locationIdStr);

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

      const recordDate = record.date instanceof Date 
        ? record.date 
        : typeof record.date === 'string' 
          ? new Date(record.date) 
          : new Date();
      const dateStr = recordDate.toISOString().split('T')[0];

      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== 'object') continue;

        const ticketNumber = ticket.TicketNumber || ticket.TicketNr || ticket.ticketNumber || ticket.ticketNr || '';
        if (!ticketNumber) continue;

        const key = `${ticketNumber}_${dateStr}`;
        
        if (!transactionMap.has(key)) {
          const ticketTable = ticket.TableNumber || ticket.tableNumber || ticket.TableName || ticket.tableName || null;
          const tableNumber = ticketTable != null ? (typeof ticketTable === 'number' ? ticketTable : parseInt(String(ticketTable), 10)) : null;
          const tableNumberFinal = (tableNumber != null && !isNaN(tableNumber)) ? tableNumber : undefined;

          transactionMap.set(key, {
            ticketNumber: ticketNumber,
            date: dateStr,
            locationId: record.locationId instanceof ObjectId ? record.locationId : new ObjectId(locationIdStr),
            locationName: locationInfo?.name || 'Unknown',
            tableNumber: tableNumberFinal,
            waiterName: ticket.WaiterName || ticket.waiterName || ticket.UserName || ticket.userName || undefined,
            paymentMethod: ticket.PaymentMethod || ticket.paymentMethod || undefined,
            time: ticket.Time || ticket.time || undefined,
            totalRevenue: 0,
            totalItems: 0,
            itemCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        const transaction = transactionMap.get(key)!;
        
        // Process orders to calculate totals
        const orders = ticket.Orders || ticket.orders || [];
        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines) || orderLines.length === 0) continue;

            orderLines.forEach((line: any) => {
              if (!line || typeof line !== 'object') return;
              
              const revenue = line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? 0;
              const quantity = line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 0;
              
              transaction.totalRevenue += typeof revenue === 'number' ? revenue : 0;
              transaction.totalItems += typeof quantity === 'number' ? quantity : 0;
              transaction.itemCount += 1;
            });
          }
        }
      }
    }

    const transactions = Array.from(transactionMap.values());

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        recordsAggregated: 0,
        message: 'No transactions found to aggregate',
      });
    }

    // Delete existing records for this date range and location
    const deleteQuery: any = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };
    if (locationId) {
      deleteQuery.locationId = new ObjectId(locationId);
    }
    await db.collection('transactions_aggregated').deleteMany(deleteQuery);

    // Insert aggregated transactions
    const result = await db.collection('transactions_aggregated').insertMany(transactions);

    return NextResponse.json({
      success: true,
      recordsAggregated: result.insertedCount,
      message: `Aggregated ${result.insertedCount} transactions`,
    });
  } catch (error: any) {
    console.error('[Aggregate Transactions] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to aggregate transactions' },
      { status: 500 }
    );
  }
}







