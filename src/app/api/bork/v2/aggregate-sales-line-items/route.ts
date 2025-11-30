/**
 * POST /api/bork/v2/aggregate-sales-line-items
 * 
 * Aggregate Bork raw data into sales_line_items_aggregated collection
 * Line-item level data - one record per product sold
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
import { SalesLineItemAggregated } from '@/lib/mongodb/v2-schema';

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

    // Extract line items from raw data
    const lineItems: SalesLineItemAggregated[] = [];
    let salesRecordCounter = 0;

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

        const ticketKey = ticket.Key || ticket.key || null;
        const ticketNumber = ticket.TicketNumber || ticket.TicketNr || ticket.ticketNumber || ticket.ticketNr || '';
        const ticketTable = ticket.TableNumber || ticket.tableNumber || ticket.TableName || ticket.tableName || null;
        const ticketWaiter = ticket.WaiterName || ticket.waiterName || ticket.UserName || ticket.userName || null;
        const ticketPayment = ticket.PaymentMethod || ticket.paymentMethod || null;
        const ticketTime = ticket.Time || ticket.time || null;

        const orders = ticket.Orders || ticket.orders || [];

        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines) || orderLines.length === 0) continue;

            const orderKey = order.Key || order.key || null;
            const rawTableNumber = order.TableNr || order.tableNr || order.TableNumber || order.tableNumber || ticketTable;
            const tableNumber = rawTableNumber != null ? (typeof rawTableNumber === 'number' ? rawTableNumber : parseInt(String(rawTableNumber), 10)) : null;
            const tableNumberFinal = (tableNumber != null && !isNaN(tableNumber)) ? tableNumber : null;
            const waiterName = order.UserName || order.userName || order.WaiterName || order.waiterName || ticketWaiter;
            const orderTime = order.Time || order.time || ticketTime;

            orderLines.forEach((line: any, lineIndex: number) => {
              if (!line || typeof line !== 'object') return;

              salesRecordCounter++;
              const lineKey = line.Key || line.key || line.LineKey || line.lineKey || null;
              
              const lineItem: SalesLineItemAggregated = {
                ticketNumber: ticketNumber || '',
                ticketKey: ticketKey || '',
                orderKey: orderKey || '',
                orderLineKey: lineKey || '',
                date: dateStr,
                locationId: record.locationId instanceof ObjectId ? record.locationId : new ObjectId(locationIdStr),
                locationName: locationInfo?.name || 'Unknown',
                productName: line.ProductName || line.productName || line.Name || line.name || '',
                productSku: line.ProductSku || line.productSku || line.Sku || line.sku || undefined,
                productNumber: line.ProductNr || line.productNr || line.ProductNumber || line.productNumber || undefined,
                category: line.GroupName || line.groupName || line.Category || line.category || '',
                groupName: line.GroupName || line.groupName || line.Category || line.category || undefined,
                quantity: line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 1,
                unitPrice: line.Price ?? line.price ?? line.UnitPrice ?? line.unitPrice ?? 0,
                totalExVat: line.TotalEx ?? line.totalEx ?? line.TotalExVat ?? line.totalExVat ?? 0,
                totalIncVat: line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? 0,
                vatRate: line.VatPerc ?? line.vatPerc ?? line.VatRate ?? line.vatRate ?? 0,
                vatAmount: line.VatAmount ?? line.vatAmount ?? 0,
                costPrice: line.CostPrice ?? line.costPrice ?? undefined,
                tableNumber: tableNumberFinal ?? undefined,
                waiterName: waiterName || undefined,
                paymentMethod: ticketPayment || undefined,
                time: orderTime || undefined,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              lineItems.push(lineItem);
            });
          }
        }
      }
    }

    if (lineItems.length === 0) {
      return NextResponse.json({
        success: true,
        recordsAggregated: 0,
        message: 'No line items found to aggregate',
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
    await db.collection('sales_line_items_aggregated').deleteMany(deleteQuery);

    // Insert aggregated line items
    const result = await db.collection('sales_line_items_aggregated').insertMany(lineItems);

    return NextResponse.json({
      success: true,
      recordsAggregated: result.insertedCount,
      message: `Aggregated ${result.insertedCount} sales line items`,
    });
  } catch (error: any) {
    console.error('[Aggregate Sales Line Items] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to aggregate sales line items' },
      { status: 500 }
    );
  }
}

