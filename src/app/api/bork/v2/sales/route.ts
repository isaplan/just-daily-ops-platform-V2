/**
 * GET /api/bork/v2/sales
 * Fetch sales data from bork_raw_data collection
 * Extracts individual order lines from tickets/orders
 * 
 * ⚠️ REST API - COMMENTED OUT - DELETE WHEN GRAPHQL IS WORKING PROPERLY
 * This endpoint is no longer used. The application now uses GraphQL via:
 * - GraphQL Query: dailySales
 * - Service: src/lib/services/sales/bork-sales-v2.service.ts
 * - GraphQL Resolver: src/lib/graphql/v2-resolvers.ts
 */

/*
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';
import { BorkSalesRecord } from '@/models/sales/bork-sales-v2.model';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds

export async function GET(request: NextRequest) {
  try {
    console.log('========================================');
    console.log('[API /bork/v2/sales] REQUEST START');
    console.log('========================================');
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const locationId = searchParams.get('locationId');
    const category = searchParams.get('category');
    const productName = searchParams.get('productName');

    console.log('[API /bork/v2/sales] Params:', { startDate, endDate, page, limit, locationId });

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    console.log('[API /bork/v2/sales] Connecting to database...');
    let db;
    try {
      db = await getDatabase();
      console.log('[API /bork/v2/sales] Database connected successfully');
    } catch (dbError: unknown) {
      console.error('[API /bork/v2/sales] Database connection error:', dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          details: dbErrorMessage,
        },
        { status: 500 }
      );
    }
    // Convert dates to UTC for querying (data is stored in UTC at midnight)
    // Parse the date string (YYYY-MM-DD) and create UTC dates
    const start = new Date(startDate + 'T00:00:00.000Z'); // UTC, start of day
    
    // Check if startDate and endDate are the same (day view) - extend to next day for late night data
    // Otherwise (month/year view) - use end of the selected date only
    let end: Date;
    if (startDate === endDate) {
      // Day view: extend to next day 02:00 Amsterdam time (01:00 UTC) to include late night data
      const endDateObj = new Date(endDate + 'T00:00:00.000Z');
      endDateObj.setUTCDate(endDateObj.getUTCDate() + 1);
      endDateObj.setUTCHours(1, 0, 0, 0); // 01:00 UTC = 02:00 Amsterdam time
      end = endDateObj;
    } else {
      // Month/Year view: use end of the selected end date (23:59:59 UTC)
      const endDateObj = new Date(endDate + 'T00:00:00.000Z');
      endDateObj.setUTCHours(23, 59, 59, 999); // End of the selected date
      end = endDateObj;
    }

    // Build query for bork_raw_data collection
    const query: { [key: string]: unknown; date: { $gte: Date; $lte: Date } } = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // Location filter
    if (locationId && locationId !== 'all') {
      try {
        query.locationId = new ObjectId(locationId);
      } catch (e) {
        // Invalid ObjectId, skip location filter
        console.warn(`Invalid locationId: ${locationId}`, e);
      }
    }

    // Fetch raw data records with a reasonable limit to avoid memory issues
    // Start with a smaller limit for faster response
    const fetchLimit = Math.min(limit * 5, 100); // Reduced: max 100 records for faster response
    
    console.log(`[API /bork/v2/sales] Query:`, JSON.stringify({
      dateRange: {
        gte: start.toISOString(),
        lte: end.toISOString(),
      },
      locationId: query.locationId?.toString(),
    }));
    console.log(`[API /bork/v2/sales] Fetching up to ${fetchLimit} records from database...`);
    
    const fetchStartTime = Date.now();
    
    // Fetch without sort to avoid memory issues - we'll sort final results in memory
    const rawDataRecords = await db.collection('bork_raw_data')
      .find(query)
      .limit(fetchLimit)
      .toArray();
    
    console.log(`[API /bork/v2/sales] Found ${rawDataRecords.length} raw data records`);
    if (rawDataRecords.length > 0) {
      console.log(`[API /bork/v2/sales] Sample record date:`, rawDataRecords[0].date);
    }
    
    const fetchTime = Date.now() - fetchStartTime;
    console.log(`[API /bork/v2/sales] Fetch completed in ${fetchTime}ms`);
    
    console.log(`[API /bork/v2/sales] Fetched ${rawDataRecords.length} records from database`);
    
    // Sort in memory (more efficient than DB sort for limited results)
    const sortStartTime = Date.now();
    rawDataRecords.sort((a, b) => {
      try {
        const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return dateB - dateA; // Most recent first
      } catch {
        return 0; // If dates can't be compared, keep original order
      }
    });
    
    const sortTime = Date.now() - sortStartTime;
    console.log(`[API /bork/v2/sales] Sorted ${rawDataRecords.length} records in ${sortTime}ms, starting to extract sales data...`);
    
    // Early return if no records
    if (rawDataRecords.length === 0) {
      return NextResponse.json({
        success: true,
        records: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }
    
    // Debug: Log first record structure if available
    try {
      const firstRecord = rawDataRecords[0];
      console.log(`[API /bork/v2/sales] Sample record structure:`, {
        hasRawApiResponse: !!firstRecord.rawApiResponse,
        rawApiResponseType: typeof firstRecord.rawApiResponse,
        isArray: Array.isArray(firstRecord.rawApiResponse),
        dateType: typeof firstRecord.date,
        dateValue: firstRecord.date,
        locationIdType: typeof firstRecord.locationId,
        keys: Object.keys(firstRecord).slice(0, 10),
      });
      
      // Log sample rawApiResponse to understand structure
      if (firstRecord.rawApiResponse) {
        if (Array.isArray(firstRecord.rawApiResponse)) {
          const sampleTicket = firstRecord.rawApiResponse[0] || {};
          console.log(`[API /bork/v2/sales] Sample rawApiResponse[0] keys:`, Object.keys(sampleTicket));
          console.log(`[API /bork/v2/sales] Sample ticket has Orders:`, !!(sampleTicket.Orders || sampleTicket.orders));
          if (sampleTicket.Orders || sampleTicket.orders) {
            const orders = sampleTicket.Orders || sampleTicket.orders || [];
            console.log(`[API /bork/v2/sales] Sample ticket Orders count:`, Array.isArray(orders) ? orders.length : 'not an array');
            if (Array.isArray(orders) && orders.length > 0) {
              const firstOrder = orders[0] || {};
              console.log(`[API /bork/v2/sales] Sample first Order keys:`, Object.keys(firstOrder));
              console.log(`[API /bork/v2/sales] Sample first Order has Lines:`, !!(firstOrder.Lines || firstOrder.lines));
              if (firstOrder.Lines || firstOrder.lines) {
                const lines = firstOrder.Lines || firstOrder.lines || [];
                console.log(`[API /bork/v2/sales] Sample first Order Lines count:`, Array.isArray(lines) ? lines.length : 'not an array');
                if (Array.isArray(lines) && lines.length > 0) {
                  console.log(`[API /bork/v2/sales] Sample first Line keys:`, Object.keys(lines[0] || {}));
                }
              }
            }
          }
          console.log(`[API /bork/v2/sales] Sample ticket data (first 800 chars):`, JSON.stringify(sampleTicket, null, 2).substring(0, 800));
        } else {
          console.log(`[API /bork/v2/sales] Sample rawApiResponse keys:`, Object.keys(firstRecord.rawApiResponse));
          console.log(`[API /bork/v2/sales] Sample ticket data (first 800 chars):`, JSON.stringify(firstRecord.rawApiResponse, null, 2).substring(0, 800));
        }
      }
    } catch (debugError) {
      console.warn(`[API /bork/v2/sales] Error in debug logging:`, debugError);
    }

    // Get location names for records
    const locationIds = new Set<string>();
    rawDataRecords.forEach((record) => {
      try {
        if (record.locationId) {
          const locId = record.locationId instanceof ObjectId 
            ? record.locationId.toString() 
            : typeof record.locationId === 'string' 
              ? record.locationId 
              : String(record.locationId);
          if (locId) {
            locationIds.add(locId);
          }
        }
      } catch (e) {
        console.warn(`[API /bork/v2/sales] Error processing locationId:`, e);
      }
    });

    const locationMap = new Map<string, { name: string; code?: string }>();
    if (locationIds.size > 0) {
      try {
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
            .toArray() as Array<{ _id?: ObjectId; name?: string; code?: string }>;
          
          locations.forEach((loc) => {
            if (loc._id) {
              locationMap.set(loc._id.toString(), {
                name: loc.name || 'Unknown',
                code: loc.code,
              });
            }
          });
        }
      } catch (e) {
        console.warn(`[API /bork/v2/sales] Error fetching locations:`, e);
      }
    }

    // Extract individual sales records from tickets/orders/lines
    const extractStartTime = Date.now();
    const allSalesRecords: BorkSalesRecord[] = [];
    let processedCount = 0;
    let salesRecordCounter = 0; // Global counter for unique IDs
    
    for (const record of rawDataRecords) {
      const recordId = record._id
        ? (record._id instanceof ObjectId ? record._id.toString() : String(record._id))
        : 'unknown';
      processedCount++;
      if (processedCount % 10 === 0) {
        const elapsed = Date.now() - extractStartTime;
        console.log(`[API /bork/v2/sales] Processing record ${processedCount}/${rawDataRecords.length}... (${elapsed}ms elapsed)`);
      }
      try {
        const rawApiResponse = record.rawApiResponse;
        const locationIdStr = record.locationId?.toString() || '';
        const locationInfo = locationMap.get(locationIdStr);
        
        if (!rawApiResponse) {
          console.warn(`[API /bork/v2/sales] Record ${recordId} has no rawApiResponse`);
          continue;
        }

        // Handle different response structures
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let tickets: any[] = [];
        
        if (Array.isArray(rawApiResponse)) {
          // If it's an array, use it directly
          tickets = rawApiResponse;
        } else if (rawApiResponse && typeof rawApiResponse === 'object') {
          // Check if it has a Tickets property (nested structure)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = rawApiResponse as any;
          if (response.Tickets && Array.isArray(response.Tickets)) {
            tickets = response.Tickets;
          } else if (response.tickets && Array.isArray(response.tickets)) {
            tickets = response.tickets;
          } else {
            // If it's a single object, wrap it in an array
            tickets = [rawApiResponse];
          }
        }

        if (tickets.length === 0) {
          console.warn(`[API /bork/v2/sales] Record ${recordId} has no tickets to process`);
          continue;
        }
        
        for (const ticket of tickets) {
          if (!ticket || typeof ticket !== 'object') continue;

          // Extract date from record once per ticket
          const recordDate = record.date instanceof Date 
            ? record.date 
            : typeof record.date === 'string' 
              ? new Date(record.date) 
              : new Date();

          const ticketKey = ticket.Key || ticket.key || null;
          const ticketNumber = ticket.TicketNumber || ticket.TicketNr || ticket.ticketNumber || ticket.ticketNr || '';
          const ticketTable = ticket.TableNumber || ticket.tableNumber || ticket.TableName || ticket.tableName || null;
          const ticketWaiter = ticket.WaiterName || ticket.waiterName || ticket.UserName || ticket.userName || null;
          const ticketPayment = ticket.PaymentMethod || ticket.paymentMethod || null;
          const ticketTime = ticket.Time || ticket.time || null;

          let createdFromLines = false;
          const orders = ticket.Orders || ticket.orders || [];

          // Extract line-level data from Orders -> Lines structure
          if (Array.isArray(orders) && orders.length > 0) {
            for (const order of orders) {
              if (!order || typeof order !== 'object') continue;

              const orderLines = order.Lines || order.lines || [];
              if (!Array.isArray(orderLines) || orderLines.length === 0) {
                // If no lines in this order, continue to next order
                continue;
              }

              const orderKey = order.Key || order.key || null;
              // Prefer order-level table/waiter/time, fallback to ticket-level
              const tableNumber = order.TableNr || order.tableNr || order.TableNumber || order.tableNumber || ticketTable;
              const waiterName = order.UserName || order.userName || order.WaiterName || order.waiterName || ticketWaiter;
              const orderTime = order.Time || order.time || ticketTime;

              // Process each line item
              orderLines.forEach((line, lineIndex) => {
                if (!line || typeof line !== 'object') return;

                // Apply category filter if specified
                if (category && category !== 'all') {
                  const lineCategory = line.GroupName || line.groupName || line.Category || line.category;
                  if (!lineCategory || lineCategory !== category) return;
                }

                // Extract all line-level fields with multiple fallback options
                const lineProductName = line.ProductName || line.productName || line.Name || line.name || null;
                
                // Apply product name filter if specified
                if (productName) {
                  if (!lineProductName || !lineProductName.toLowerCase().includes(productName.toLowerCase())) return;
                }

                createdFromLines = true;
                salesRecordCounter++;
                const lineKey = line.Key || line.key || line.LineKey || line.lineKey || null;
                const uniqueId = `${recordId}_${ticketKey || 'ticket'}_${orderKey || 'order'}_${lineKey || lineIndex}_${salesRecordCounter}`;
                const productSku = line.ProductSku || line.productSku || line.Sku || line.sku || line.ProductKey || line.productKey || null;
                const productNumber = line.ProductNr || line.productNr || line.ProductNumber || line.productNumber || null;
                const lineCategory = line.GroupName || line.groupName || line.Category || line.category || null;
                const quantity = line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 1;
                const unitPrice = line.Price ?? line.price ?? line.UnitPrice ?? line.unitPrice ?? null;
                const totalExVat = line.TotalEx ?? line.totalEx ?? line.TotalExVat ?? line.totalExVat ?? line.RevenueExVat ?? line.revenueExVat ?? null;
                const totalIncVat = line.TotalInc ?? line.totalInc ?? line.TotalIncVat ?? line.totalIncVat ?? line.RevenueIncVat ?? line.revenueIncVat ?? null;
                const vatRate = line.VatPerc ?? line.vatPerc ?? line.VatRate ?? line.vatRate ?? line.VatPercentage ?? line.vatPercentage ?? null;
                const vatAmount = line.VatAmount ?? line.vatAmount ?? (
                  totalIncVat !== null && totalExVat !== null
                    ? Number(totalIncVat) - Number(totalExVat)
                    : null
                );
                const costPrice = line.CostPrice ?? line.costPrice ?? null;

                const salesRecord: BorkSalesRecord = {
                  id: uniqueId,
                  date: recordDate.toISOString().split('T')[0],
                  location_id: locationIdStr,
                  location_name: locationInfo?.name || null,
                  ticket_key: ticketKey,
                  ticket_number: ticketNumber,
                  order_key: orderKey,
                  order_line_key: lineKey,
                  product_name: lineProductName,
                  product_sku: productSku,
                  product_number: productNumber,
                  category: lineCategory,
                  group_name: lineCategory,
                  quantity: quantity,
                  unit_price: unitPrice,
                  total_ex_vat: totalExVat,
                  total_inc_vat: totalIncVat,
                  vat_rate: vatRate,
                  vat_amount: vatAmount,
                  cost_price: costPrice,
                  payment_method: ticketPayment,
                  table_number: tableNumber,
                  waiter_name: waiterName,
                  time: orderTime,
                  created_at: record.createdAt 
                    ? (record.createdAt instanceof Date 
                        ? record.createdAt.toISOString() 
                        : typeof record.createdAt === 'string' 
                          ? new Date(record.createdAt).toISOString() 
                          : null)
                    : null,
                };

                allSalesRecords.push(salesRecord);
              });
            }
          }

          // Only create fallback "Ticket Total" record if NO lines were extracted
          if (createdFromLines) {
            continue;
          }
          
          if (category && category !== 'all') {
            const ticketCategory = ticket.Category || ticket.category || null;
            if (ticketCategory && ticketCategory !== category) continue;
          }
          
          if (productName) {
            const ticketProductName = ticket.ProductName || ticket.productName || '';
            if (ticketProductName && !ticketProductName.toLowerCase().includes(productName.toLowerCase())) continue;
          }

          // For fallback path, try to get table/waiter from orders if not in ticket
          let fallbackTableNumber = ticketTable;
          let fallbackWaiterName = ticketWaiter;
          let fallbackTime = ticketTime;
          
          // Check orders for table/waiter info if not found at ticket level
          if ((!fallbackTableNumber || !fallbackWaiterName) && Array.isArray(orders) && orders.length > 0) {
            for (const order of orders) {
              if (!order || typeof order !== 'object') continue;
              if (!fallbackTableNumber) {
                fallbackTableNumber = order.TableNr || order.tableNr || null;
              }
              if (!fallbackWaiterName) {
                fallbackWaiterName = order.UserName || order.userName || null;
              }
              if (!fallbackTime) {
                fallbackTime = order.Time || order.time || null;
              }
              // If we found all, break early
              if (fallbackTableNumber && fallbackWaiterName && fallbackTime) break;
            }
          }

          salesRecordCounter++;
          const fallbackId = `${recordId}_${ticketKey || 'ticket'}_${salesRecordCounter}`;
          const fallbackTotalInc = ticket.RevenueIncVat || ticket.revenueIncVat || ticket.TotalInc || ticket.TotalPrice || ticket.TotalToPay || ticket.Revenue || null;
          const fallbackTotalEx = ticket.RevenueExVat || ticket.revenueExVat || (typeof fallbackTotalInc === 'number' ? Number(fallbackTotalInc) / 1.21 : null);
          
          // Check if product_name is actually a location name (fallback case)
          const rawProductName = ticket.ProductName || ticket.CenterName || null;
          const locationName = locationInfo?.name || null;
          const fallbackProductName = (rawProductName && rawProductName === locationName) 
            ? 'Ticket Total' 
            : (rawProductName || 'Ticket Total');
          
          const salesRecord: BorkSalesRecord = {
            id: fallbackId,
            date: recordDate.toISOString().split('T')[0],
            location_id: locationIdStr,
            location_name: locationName,
            ticket_key: ticketKey,
            ticket_number: ticketNumber,
            order_key: null,
            order_line_key: null,
            product_name: fallbackProductName,
            product_sku: ticket.ProductSku || ticket.productSku || null,
            product_number: ticket.ProductNr || ticket.productNr || null,
            category: ticket.Category || ticket.category || (rawProductName === locationName ? null : ticket.CenterName) || null,
            group_name: ticket.Category || ticket.category || null,
            quantity: ticket.Quantity || ticket.quantity || 1,
            unit_price: ticket.Price || ticket.price || (fallbackTotalInc !== null ? Number(fallbackTotalInc) : null),
            total_ex_vat: fallbackTotalEx,
            total_inc_vat: fallbackTotalInc,
            vat_rate: ticket.VatRate || ticket.vatRate || null,
            vat_amount: ticket.VatAmount || ticket.vatAmount || (
              fallbackTotalInc !== null && fallbackTotalEx !== null
                ? Number(fallbackTotalInc) - Number(fallbackTotalEx)
                : null
            ),
            cost_price: ticket.CostPrice || ticket.costPrice || null,
            payment_method: ticketPayment,
            table_number: fallbackTableNumber,
            waiter_name: fallbackWaiterName,
            time: fallbackTime,
            created_at: record.createdAt 
              ? (record.createdAt instanceof Date 
                  ? record.createdAt.toISOString() 
                  : typeof record.createdAt === 'string' 
                    ? new Date(record.createdAt).toISOString() 
                    : null)
              : null,
          };
          
          allSalesRecords.push(salesRecord);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`[API /bork/v2/sales] Error processing record ${recordId}:`, error);
        console.error(`[API /bork/v2/sales] Error message:`, errorMessage);
        console.error(`[API /bork/v2/sales] Error stack:`, errorStack);
        try {
          console.error(`[API /bork/v2/sales] Record structure:`, {
            hasRawApiResponse: !!record.rawApiResponse,
            rawApiResponseType: typeof record.rawApiResponse,
            dateType: typeof record.date,
            hasLocationId: !!record.locationId,
          });
        } catch (logError: unknown) {
          console.error(`[API /bork/v2/sales] Could not log record structure:`, logError);
        }
        // Continue processing other records
        continue;
      }
    }

    const extractTime = Date.now() - extractStartTime;
    console.log(`[API /bork/v2/sales] Extracted ${allSalesRecords.length} sales records from ${rawDataRecords.length} database records in ${extractTime}ms`);

    // Skip total count for faster response - use extracted records count
    console.log(`[API /bork/v2/sales] Skipping total count for faster response`);

    // Filter records to only include dates within the requested range (in case query included extra day)
    // This ensures month/year views don't show data from next month/year
    const requestedStartDate = startDate; // YYYY-MM-DD format
    const requestedEndDate = endDate; // YYYY-MM-DD format
    
    const filteredRecords = allSalesRecords.filter(record => {
      const recordDate = record.date; // Should be YYYY-MM-DD format
      return recordDate >= requestedStartDate && recordDate <= requestedEndDate;
    });
    
    // Sort sales records by date and time (most recent first)
    filteredRecords.sort((a, b) => {
      // First sort by date (most recent first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // Most recent date first
      }
      
      // If same date, sort by time (most recent first)
      const timeA = a.time ? a.time : '00:00:00';
      const timeB = b.time ? b.time : '00:00:00';
      // Compare time strings (HH:MM:SS format)
      return timeB.localeCompare(timeA); // Most recent time first
    });
    
    // Apply pagination to filtered sales records
    const total = filteredRecords.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

    // Calculate total pages based on extracted records
    const totalPages = Math.ceil(total / limit);

    const totalTime = Date.now() - fetchStartTime;
    console.log(`[API /bork/v2/sales] Returning page ${page} of ${totalPages} (${paginatedRecords.length} records) - Total time: ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      records: paginatedRecords,
      total,
      page,
      totalPages,
      // Include metadata
      metadata: {
        databaseRecordsFetched: rawDataRecords.length,
        salesRecordsExtracted: allSalesRecords.length,
        processingTimeMs: totalTime,
        note: `Showing ${paginatedRecords.length} of ${total} sales records. Use date filters to narrow results.`,
      },
    });
  } catch (error: unknown) {
    console.error('[API /bork/v2/sales] Error:', error);
    const stack = error instanceof Error ? error.stack : undefined;
    const message = error instanceof Error ? error.message : 'Failed to fetch sales data';
    console.error('[API /bork/v2/sales] Error stack:', stack);
    return NextResponse.json(
      {
        success: false,
        error: message,
        details: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
      { status: 500 }
    );
  }
}
*/

