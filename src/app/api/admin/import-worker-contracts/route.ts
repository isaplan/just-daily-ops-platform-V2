/**
 * POST /api/admin/import-worker-contracts
 * 
 * Imports worker contract data from Excel file and updates worker_profiles
 * Updates hourly_wage, contract_hours, contract_type, effective_from, effective_to
 */

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { getDatabase } from '@/lib/mongodb/v2-connection';
import { ObjectId } from 'mongodb';

interface ContractRow {
  '▲ naam': string; // Worker name
  'contracttype': string; // Contract type
  'uurloon': string; // Hourly wage (e.g., "€19", "€12,5")
  'wekelijkse contracturen': string; // Weekly contract hours (e.g., "00:00")
  'contractvestiging': string; // Location name
  'einddatum contract': string; // End date (DD/MM/YYYY)
  'startdatum contract': string; // Start date (DD/MM/YYYY)
  'startdatum dienstverband': string; // Employment start date
  'support ID': string; // Eitje user ID
}

/**
 * Parse hourly wage from "€19" or "€12,5" to number
 */
function parseHourlyWage(wageStr: string): number | null {
  if (!wageStr || typeof wageStr !== 'string') return null;
  // Remove €, trim, replace comma with dot
  const cleaned = wageStr.replace('€', '').trim().replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse weekly contract hours from "00:00" format to number of hours
 */
function parseContractHours(hoursStr: string): number | null {
  if (!hoursStr || typeof hoursStr !== 'string') return null;
  // Format: "HH:MM" or "H:MM" or just "0"
  if (hoursStr === '0' || hoursStr === '00:00') return 0;
  
  const parts = hoursStr.split(':');
  if (parts.length !== 2) return null;
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  if (isNaN(hours) || isNaN(minutes)) return null;
  
  return hours + (minutes / 60);
}

/**
 * Parse date from "DD/MM/YYYY" to ISO string
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  // Create date in UTC
  return new Date(Date.UTC(year, month - 1, day));
}

export async function POST() {
  try {
    const db = await getDatabase();

    // Path to Excel file
    const fileName = 'eitje-in-en-actieve-overzicht-contracten-julius-ai - 2025-11-09-00-15-26 (42545).xlsx';
    const filePath = path.join(
      process.cwd(),
      'dev-docs',
      'eitje-reference-api-data',
      fileName
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: false,
        error: `File not found: ${filePath}`,
      });
    }

    // Read Excel file
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Find header row
    const allData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(30, allData.length); i++) {
      const row = allData[i];
      if (row && row.length > 1) {
        const rowStr = row.map(cell => String(cell || '').toLowerCase()).join('|');
        if (rowStr.includes('contracttype') || rowStr.includes('uurloon')) {
          headerRowIndex = i;
          break;
        }
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Could not find header row in Excel file',
      });
    }

    // Parse data
    const contracts = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRowIndex,
      defval: null
    }) as ContractRow[];

    console.log(`[Import Contracts] Found ${contracts.length} contract rows`);

    // Process each contract
    let updated = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const contract of contracts) {
      try {
        // Extract data
        const eitjeUserId = contract['support ID'] ? parseInt(contract['support ID'], 10) : null;
        const workerName = contract['▲ naam'];
        const contractType = contract['contracttype'] || null;
        const hourlyWage = parseHourlyWage(contract['uurloon']);
        const contractHours = parseContractHours(contract['wekelijkse contracturen']);
        const locationName = contract['contractvestiging'] || null;
        const effectiveFrom = parseDate(contract['startdatum contract']);
        const effectiveTo = parseDate(contract['einddatum contract']);

        // Skip if no eitje_user_id
        if (!eitjeUserId) {
          skipped++;
          continue;
        }

        // Skip if no hourly wage (means no active contract)
        if (!hourlyWage) {
          skipped++;
          continue;
        }

        // Find matching location_id
        let locationId: string | null = null;
        if (locationName) {
          const location = await db.collection('locations').findOne({
            name: { $regex: new RegExp(`^${locationName}$`, 'i') }
          });
          locationId = location?._id?.toString() || null;
        }

        // Check if worker profile exists
        const existing = await db.collection('worker_profiles').findOne({
          eitje_user_id: eitjeUserId
        });

        const now = new Date();

        if (existing) {
          // Update existing profile
          await db.collection('worker_profiles').updateOne(
            { _id: existing._id },
            {
              $set: {
                hourly_wage: hourlyWage,
                contract_hours: contractHours,
                contract_type: contractType,
                location_id: locationId,
                effective_from: effectiveFrom,
                effective_to: effectiveTo,
                wage_override: true, // Mark as having real data from Eitje
                updated_at: now,
              }
            }
          );
          updated++;
        } else {
          // Create new profile
          await db.collection('worker_profiles').insertOne({
            eitje_user_id: eitjeUserId,
            location_id: locationId,
            contract_type: contractType,
            contract_hours: contractHours,
            hourly_wage: hourlyWage,
            wage_override: true,
            effective_from: effectiveFrom,
            effective_to: effectiveTo,
            notes: `Imported from Eitje contracts Excel (${workerName})`,
            created_at: now,
            updated_at: now,
          });
          created++;
        }

      } catch (error: any) {
        errors.push(`Row ${workerName || 'unknown'}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import complete: ${updated} updated, ${created} created, ${skipped} skipped`,
      stats: {
        totalRows: contracts.length,
        updated,
        created,
        skipped,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
    });

  } catch (error: any) {
    console.error('[API /admin/import-worker-contracts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to import contracts',
      },
      { status: 500 }
    );
  }
}

