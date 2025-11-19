/**
 * POST /api/admin/parse-worker-contracts
 * 
 * Reads the Eitje contracts Excel file and shows what data is available
 * File: dev-docs/eitje-reference-api-data/eitje-in-en-actieve-overzicht-contracten-julius-ai - 2025-11-09-00-15-26 (42545).xlsx
 */

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export async function POST() {
  try {
    // Path to Excel file
    const fileName = 'eitje-in-en-actieve-overzicht-contracten-julius-ai - 2025-11-09-00-15-26 (42545).xlsx';
    const filePath = path.join(
      process.cwd(),
      'dev-docs',
      'eitje-reference-api-data',
      fileName
    );

    console.log('[Parse Worker Contracts] Attempting to read file:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      // Try to list directory contents
      const dirPath = path.join(process.cwd(), 'dev-docs', 'eitje-reference-api-data');
      let dirContents: string[] = [];
      try {
        dirContents = fs.readdirSync(dirPath);
      } catch (e) {
        console.error('[Parse Worker Contracts] Cannot read directory:', e);
      }
      
      return NextResponse.json({
        success: false,
        error: `File not found: ${filePath}`,
        directoryExists: fs.existsSync(dirPath),
        directoryContents: dirContents,
      });
    }

    // Read Excel file
    console.log('[Parse Worker Contracts] Reading file...');
    let workbook;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch (readError: any) {
      console.error('[Parse Worker Contracts] Error reading file:', readError);
      return NextResponse.json({
        success: false,
        error: `Cannot access file: ${readError.message}`,
        filePath,
      });
    }
    
    // Get first sheet name
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON - skip first few rows (metadata)
    // Try to find the header row by looking for common contract columns
    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    console.log('[Parse Worker Contracts] Total rows:', allData.length);
    console.log('[Parse Worker Contracts] First 10 rows:', allData.slice(0, 10));

    // Find the header row (look for "contracttype" or "uurloon" which are unique column names)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(30, allData.length); i++) {
      const row = allData[i];
      if (row && row.length > 1) {
        // Check if this row contains "contracttype" or "uurloon"
        const rowStr = row.map(cell => String(cell || '').toLowerCase()).join('|');
        if (rowStr.includes('contracttype') || rowStr.includes('uurloon')) {
          headerRowIndex = i;
          console.log('[Parse Worker Contracts] Found header at row:', i, 'Values:', row);
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Could not find header row in Excel file',
        firstRows: allData.slice(0, 10),
      });
    }

    // Convert to JSON using the header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      range: headerRowIndex,
      defval: null 
    });

    if (jsonData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data found after header row',
      });
    }

    // Get column names from first data row
    const columns = Object.keys(jsonData[0] as Record<string, any>);

    // Show sample data (first 10 rows)
    const sampleData = jsonData.slice(0, 10);

    return NextResponse.json({
      success: true,
      message: `Found ${jsonData.length} rows in Excel file`,
      sheetName,
      columns,
      sampleData,
      totalRows: jsonData.length,
    });

  } catch (error: any) {
    console.error('[API /admin/parse-worker-contracts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to parse Excel file',
      },
      { status: 500 }
    );
  }
}

