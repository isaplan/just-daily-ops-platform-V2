/**
 * GET /api/bork/v2/categories
 * 
 * Get unique categories from Bork sales data
 * 
 * Query params:
 * - startDate: optional - YYYY-MM-DD format
 * - endDate: optional - YYYY-MM-DD format
 * - locationId: optional - filter by location
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');

    const db = await getDatabase();

    // Build query for bork_raw_data collection
    const query: { [key: string]: unknown; date?: { $gte: Date; $lte: Date } } = {};

    // Date filtering
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    // Location filter
    if (locationId && locationId !== 'all') {
      try {
        query.locationId = new ObjectId(locationId);
      } catch (e) {
        // Invalid ObjectId, skip location filter
        console.warn(`Invalid locationId: ${locationId}`);
      }
    }

    // Fetch raw data records
    const rawDataRecords = await db.collection('bork_raw_data')
      .find(query)
      .limit(500) // Limit to avoid memory issues
      .toArray();

    // Extract categories with quantity counts from rawApiResponse
    const categoryCounts = new Map<string, number>();

    for (const record of rawDataRecords) {
      const rawApiResponse = record.rawApiResponse;
      if (!rawApiResponse) continue;

      // Handle both array and single object responses
      const tickets = Array.isArray(rawApiResponse) ? rawApiResponse : [rawApiResponse];

      for (const ticket of tickets) {
        if (!ticket || typeof ticket !== 'object') continue;

        // Check Orders -> Lines structure
        const orders = ticket.Orders || ticket.orders || [];
        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            if (!order || typeof order !== 'object') continue;
            const orderLines = order.Lines || order.lines || [];
            if (!Array.isArray(orderLines)) continue;

            for (const line of orderLines) {
              if (!line || typeof line !== 'object') continue;
              const category = line.GroupName || line.groupName || line.Category || line.category;
              if (category && typeof category === 'string' && category.trim()) {
                const categoryName = category.trim();
                const quantity = Math.abs(line.Qty ?? line.qty ?? line.Quantity ?? line.quantity ?? 0);
                categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + quantity);
              }
            }
          }
        } else {
          // Check top-level category
          const category = ticket.Category || ticket.category;
          if (category && typeof category === 'string' && category.trim()) {
            const categoryName = category.trim();
            const quantity = Math.abs(ticket.Quantity ?? ticket.quantity ?? 1);
            categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + quantity);
          }
        }
      }
    }

    // Convert to array, sort by quantity (descending), then by name
    const categories = Array.from(categoryCounts.entries())
      .sort((a, b) => {
        // First sort by quantity (descending)
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        // Then sort by name (ascending)
        return a[0].localeCompare(b[0]);
      })
      .map(([name]) => name); // Extract just the category names

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: unknown) {
    console.error('[API /bork/v2/categories] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
      },
      { status: 500 }
    );
  }
}

