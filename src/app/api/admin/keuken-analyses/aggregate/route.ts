/**
 * Admin API: Trigger Keuken Analyses Aggregation
 * Manually trigger aggregation for keuken_analyses_aggregated collection
 */

import { NextRequest, NextResponse } from "next/server";
import { aggregateKeukenAnalysesData } from "@/lib/services/daily-ops/keuken-analyses-aggregation.service";
import { ObjectId } from "mongodb";

export const maxDuration = 300; // 5 minutes (aggregation can take time)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, locationId } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Normalize locationId
    let queryLocationId: string | ObjectId | undefined = locationId;
    if (locationId === "all" || !locationId) {
      queryLocationId = undefined; // Aggregate for all locations
    } else {
      try {
        queryLocationId = locationId instanceof ObjectId ? locationId : new ObjectId(locationId);
      } catch (e) {
        return NextResponse.json(
          { success: false, error: `Invalid locationId: ${locationId}` },
          { status: 400 }
        );
      }
    }

    console.log(`[Keuken Aggregation API] Starting aggregation:`, {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      locationId: queryLocationId?.toString() || "all",
    });

    // Trigger aggregation
    const result = await aggregateKeukenAnalysesData(
      start,
      end,
      queryLocationId
    );

    console.log(`[Keuken Aggregation API] Aggregation complete:`, {
      aggregated: result.aggregated,
      errors: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      aggregated: result.aggregated,
      errors: result.errors,
      message: `Successfully aggregated ${result.aggregated} day(s) of keuken analyses data`,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Keuken Aggregation API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        aggregated: 0,
        errors: [errorMessage],
      },
      { status: 500 }
    );
  }
}

