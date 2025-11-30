/**
 * GET /api/admin/eitje-data-crawler
 * 
 * Investigates Excel files in dev-docs/eitje-data-check-30NOV2025/
 * Maps files to appropriate aggregated database collections
 */

import { NextResponse } from 'next/server';
import * as path from 'path';
import * as fs from 'fs';

// Import the crawler function dynamically
const crawlEitjeDataFolder = require(path.join(process.cwd(), 'tools', 'eitje-data-crawler')).crawlEitjeDataFolder;

export async function GET() {
  try {
    const result = crawlEitjeDataFolder();
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[Eitje Data Crawler API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to crawl Eitje data files',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

