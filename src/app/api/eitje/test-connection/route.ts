/**
 * Eitje API Test Connection Route
 * 
 * Tests the Eitje API connection with provided credentials
 * Uses custom headers authentication (not Basic Auth)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchEitjeEnvironments } from "@/lib/eitje/v2-api-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      baseUrl,
      partnerUsername,
      partnerPassword,
      apiUsername,
      apiPassword,
    } = body;

    if (!baseUrl || !partnerUsername || !partnerPassword || !apiUsername || !apiPassword) {
      return NextResponse.json(
        { success: false, error: "All credentials are required" },
        { status: 400 }
      );
    }

    // Test connection using the V2 API client
    try {
      const credentials = {
        partner_username: partnerUsername,
        partner_password: partnerPassword,
        api_username: apiUsername,
        api_password: apiPassword,
      };

      const environments = await fetchEitjeEnvironments(baseUrl, credentials);
      
      return NextResponse.json({
        success: true,
        message: "Connection successful",
        data: {
          environmentsCount: Array.isArray(environments) ? environments.length : 0,
        },
      });
    } catch (connectionError: any) {
      return NextResponse.json(
        {
          success: false,
          error: connectionError.message || "Connection test failed",
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("Eitje connection test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to test connection",
      },
      { status: 500 }
    );
  }
}

