/**
 * SIMPLE DATA IMPORT SYSTEM
 * Straightforward data import without over-engineering
 */

import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface SimpleImportResult {
  success: boolean;
  processedCount: number;
  errors: string[];
  message: string;
}

export interface PowerBIRecord {
  location_id: string;
  year: number;
  month: number;
  gl_account: string;
  category: string;
  subcategory?: string;
  amount: number;
  import_id: string;
}

export interface BorkSalesRecord {
  location_id: string;
  date: string;
  product_name: string;
  category: string;
  quantity: number;
  price: number;
  revenue: number;
  import_id: string;
}

/**
 * SIMPLE PowerBI P&L Import
 * Just parse the Excel file and insert the data - no complex mapping needed
 */
export async function importPowerBIData(
  file: File,
  locationId: string,
  importId: string
): Promise<SimpleImportResult> {
  try {
    console.log('📊 Simple PowerBI Import: Starting...');
    
    // Step 1: Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    console.log(`📊 Found ${data.length} rows in Excel file`);
    
    // Step 2: Find header row (look for typical PowerBI headers)
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] || [];
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('jaar') && rowText.includes('maand') && rowText.includes('bedrag')) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      return {
        success: false,
        processedCount: 0,
        errors: ['Could not find PowerBI header row. Expected columns: Jaar, Maand, Bedrag'],
        message: 'Invalid PowerBI file format'
      };
    }
    
    console.log(`📊 Found header row at index ${headerRow}`);
    
    // Step 3: Extract data rows
    const headers = data[headerRow];
    const dataRows = data.slice(headerRow + 1);
    
    console.log(`📊 Processing ${dataRows.length} data rows`);
    
    // Step 4: Parse records
    const records: PowerBIRecord[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;
      
      try {
        const year = parseInt(row[0]);
        const month = parseMonth(row[1]);
        const glAccount = String(row[2] || '').trim();
        const category = String(row[3] || '').trim();
        const subcategory = String(row[4] || '').trim();
        const amount = parseFloat(String(row[5] || '0').replace(',', '.'));
        
        if (!year || !month || !glAccount || !category) {
          errors.push(`Row ${i + headerRow + 2}: Missing required fields`);
          continue;
        }
        
        records.push({
          location_id: locationId,
          year,
          month,
          gl_account: glAccount,
          category,
          subcategory: subcategory || null,
          amount,
          import_id: importId
        });
      } catch (error) {
        errors.push(`Row ${i + headerRow + 2}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
    
    console.log(`📊 Parsed ${records.length} valid records`);
    
    if (records.length === 0) {
      return {
        success: false,
        processedCount: 0,
        errors: ['No valid records found in file'],
        message: 'No data to import'
      };
    }
    
    // Step 5: Delete existing data for this location/year/month combinations
    const yearMonths = new Set(records.map(r => `${r.year}-${r.month}`));
    console.log(`📊 Deleting existing data for ${yearMonths.size} year-month combinations`);
    
    for (const yearMonth of yearMonths) {
      const [year, month] = yearMonth.split('-').map(Number);
      const { error: deleteError, count } = await supabase
        .from('powerbi_pnl_data')
        .delete()
        .eq('location_id', locationId)
        .eq('year', year)
        .eq('month', month)
        .select('*', { count: 'exact', head: true });
      
      if (deleteError) {
        console.error(`⚠️  Error deleting data for ${year}-${month}:`, deleteError.message);
        // Continue anyway - we'll try to insert and let the unique constraint handle it
      } else {
        console.log(`✅ Deleted existing data for ${year}-${month}${count ? ` (${count} records)` : ''}`);
      }
    }
    
    // Step 6: Insert new records in batches
    const BATCH_SIZE = 1000;
    let processedCount = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('powerbi_pnl_data')
        .insert(batch);
      
      if (error) {
        throw new Error(`Database insert error: ${error.message}`);
      }
      
      processedCount += batch.length;
      console.log(`📊 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`);
    }
    
    console.log(`✅ PowerBI Import Complete: ${processedCount} records processed`);
    
    return {
      success: true,
      processedCount,
      errors,
      message: `Successfully imported ${processedCount} PowerBI records`
    };
    
  } catch (error) {
    console.error('❌ PowerBI Import Error:', error);
    return {
      success: false,
      processedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'PowerBI import failed'
    };
  }
}

/**
 * SIMPLE Bork Sales Import
 * Just parse the Excel file and insert the data
 */
export async function importBorkSalesData(
  file: File,
  locationId: string,
  importId: string
): Promise<SimpleImportResult> {
  try {
    console.log('🛒 Simple Bork Sales Import: Starting...');
    
    // Step 1: Parse Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    console.log(`🛒 Found ${data.length} rows in Excel file`);
    
    // Step 2: Find header row (look for typical Bork headers)
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] || [];
      const rowText = row.join(' ').toLowerCase();
      if (rowText.includes('datum') && rowText.includes('product') && rowText.includes('omzet')) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) {
      return {
        success: false,
        processedCount: 0,
        errors: ['Could not find Bork header row. Expected columns: Datum, Product, Omzet'],
        message: 'Invalid Bork file format'
      };
    }
    
    console.log(`🛒 Found header row at index ${headerRow}`);
    
    // Step 3: Extract data rows
    const headers = data[headerRow];
    const dataRows = data.slice(headerRow + 1);
    
    console.log(`🛒 Processing ${dataRows.length} data rows`);
    
    // Step 4: Parse records
    const records: BorkSalesRecord[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;
      
      try {
        const date = parseDate(row[0]);
        const productName = String(row[1] || '').trim();
        const category = String(row[2] || '').trim();
        const quantity = parseFloat(String(row[3] || '0').replace(',', '.'));
        const price = parseFloat(String(row[4] || '0').replace(',', '.'));
        const revenue = parseFloat(String(row[5] || '0').replace(',', '.'));
        
        if (!date || !productName || !category) {
          errors.push(`Row ${i + headerRow + 2}: Missing required fields`);
          continue;
        }
        
        records.push({
          location_id: locationId,
          date,
          product_name: productName,
          category,
          quantity,
          price,
          revenue,
          import_id: importId
        });
      } catch (error) {
        errors.push(`Row ${i + headerRow + 2}: ${error instanceof Error ? error.message : 'Parse error'}`);
      }
    }
    
    console.log(`🛒 Parsed ${records.length} valid records`);
    
    if (records.length === 0) {
      return {
        success: false,
        processedCount: 0,
        errors: ['No valid records found in file'],
        message: 'No data to import'
      };
    }
    
    // Step 5: Insert records in batches
    const BATCH_SIZE = 1000;
    let processedCount = 0;
    
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('bork_sales_data')
        .insert(batch);
      
      if (error) {
        throw new Error(`Database insert error: ${error.message}`);
      }
      
      processedCount += batch.length;
      console.log(`🛒 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}`);
    }
    
    console.log(`✅ Bork Sales Import Complete: ${processedCount} records processed`);
    
    return {
      success: true,
      processedCount,
      errors,
      message: `Successfully imported ${processedCount} Bork sales records`
    };
    
  } catch (error) {
    console.error('❌ Bork Sales Import Error:', error);
    return {
      success: false,
      processedCount: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      message: 'Bork sales import failed'
    };
  }
}

// Helper functions
function parseMonth(monthValue: any): number {
  if (typeof monthValue === 'number') return monthValue;
  
  const monthStr = String(monthValue).toLowerCase().trim();
  const monthMap: Record<string, number> = {
    'januari': 1, 'january': 1, 'jan': 1,
    'februari': 2, 'february': 2, 'feb': 2,
    'maart': 3, 'march': 3, 'mar': 3,
    'april': 4, 'apr': 4,
    'mei': 5, 'may': 5,
    'juni': 6, 'june': 6, 'jun': 6,
    'juli': 7, 'july': 7, 'jul': 7,
    'augustus': 8, 'august': 8, 'aug': 8,
    'september': 9, 'sep': 9,
    'oktober': 10, 'october': 10, 'oct': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dec': 12
  };
  
  return monthMap[monthStr] || parseInt(monthStr) || 0;
}

function parseDate(dateValue: any): string {
  if (!dateValue) return '';
  
  // Handle Excel date numbers
  if (typeof dateValue === 'number') {
    const date = new Date((dateValue - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  // Handle string dates
  const dateStr = String(dateValue).trim();
  const date = new Date(dateStr);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  return date.toISOString().split('T')[0];
}






