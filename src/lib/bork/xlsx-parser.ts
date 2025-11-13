import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

export interface RevenueData {
  date: string;
  revenueInclVAT: number;
  revenueExclVAT: number;
}

export interface LocationData {
  locationId: string;
  datesWithRevenue: Set<string>;
  totalRevenue: number;
}

/**
 * Parse all quarterly XLSX files for all locations and extract dates with revenue
 */
export async function parseAllLocationData(): Promise<Map<string, Map<string, RevenueData>>> {
  console.log('[XLSX Parser] Starting to parse all location data...');
  
  const result = new Map<string, Map<string, RevenueData>>();
  
  // Location mapping
  const locationMap = {
    'barbea': '550e8400-e29b-41d4-a716-446655440002',
    'kinsbergen': '550e8400-e29b-41d4-a716-446655440003', 
    'lamour-toujours': '550e8400-e29b-41d4-a716-446655440001'
  };
  
  for (const [folderName, locationId] of Object.entries(locationMap)) {
    try {
      console.log(`[XLSX Parser] Parsing ${folderName}...`);
      const revenueData = await parseLocationQuarterlyFiles(folderName);
      result.set(locationId, revenueData);
      console.log(`[XLSX Parser] Found ${revenueData.size} dates with revenue for ${folderName}`);
    } catch (error) {
      console.error(`[XLSX Parser] Error parsing ${folderName}:`, error);
      result.set(locationId, new Map<string, RevenueData>());
    }
  }
  
  console.log('[XLSX Parser] Completed parsing all locations');
  return result;
}

/**
 * Parse all quarterly files for a specific location
 */
export async function parseLocationQuarterlyFiles(locationFolder: string): Promise<Map<string, RevenueData>> {
  const basePath = join(process.cwd(), '.dev-docs', 'bork-datalab-daily-revenue-per-location', locationFolder);
  const allRevenueData = new Map<string, RevenueData>();
  
  try {
    // Read all XLSX files in the location folder
    const files = fs.readdirSync(basePath).filter((file: string) => file.endsWith('.xlsx'));
    
    console.log(`[XLSX Parser] Found ${files.length} XLSX files in ${locationFolder}`);
    
    for (const file of files) {
      try {
        const filePath = join(basePath, file);
        console.log(`[XLSX Parser] Parsing file: ${file}`);
        
        const fileRevenueData = await parseXlsxFile(filePath);
        
        // Add revenue data for dates with revenue > 0
        fileRevenueData.forEach(item => {
          if (item.revenueInclVAT > 0 || item.revenueExclVAT > 0) {
            allRevenueData.set(item.date, item);
          }
        });
        
        console.log(`[XLSX Parser] Found ${fileRevenueData.filter(item => item.revenueInclVAT > 0 || item.revenueExclVAT > 0).length} dates with revenue in ${file}`);
      } catch (error) {
        console.error(`[XLSX Parser] Error parsing file ${file}:`, error);
      }
    }
  } catch (error) {
    console.error(`[XLSX Parser] Error reading directory ${basePath}:`, error);
  }
  
  return allRevenueData;
}

/**
 * Parse a single XLSX file and extract date/revenue data
 */
export async function parseXlsxFile(filePath: string): Promise<RevenueData[]> {
  try {
    // Read the file
    const fileBuffer = readFileSync(filePath);
    
    // Parse the workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Get the data worksheet (look for "Data" in the name)
    const dataSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('data'));
    const sheetName = dataSheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      console.log(`[XLSX Parser] No data found in ${filePath}`);
      return [];
    }
    
    // Find date and revenue columns
    const headers = jsonData[0] as string[];
    const dateColumnIndex = findColumnIndex(headers, ['dag', 'date', 'datum', 'day', 'day of week']);
    const revenueInclVATColumnIndex = findColumnIndex(headers, ['omzet (incl. btw)', 'omzet incl btw', 'revenue incl vat', 'total incl vat']);
    const revenueExclVATColumnIndex = findColumnIndex(headers, ['omzet (excl. btw)', 'omzet excl btw', 'revenue excl vat', 'total excl vat']);
    
    if (dateColumnIndex === -1 || (revenueInclVATColumnIndex === -1 && revenueExclVATColumnIndex === -1)) {
      console.log(`[XLSX Parser] Could not find date or revenue columns in ${filePath}`);
      console.log(`[XLSX Parser] Available columns:`, headers);
      return [];
    }
    
    console.log(`[XLSX Parser] Date column: ${headers[dateColumnIndex]}, Revenue Incl VAT: ${headers[revenueInclVATColumnIndex]}, Revenue Excl VAT: ${headers[revenueExclVATColumnIndex]}`);
    
    // Extract data rows
    const results: RevenueData[] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown[];
      
      if (!row[dateColumnIndex]) continue;
      
      try {
        // Parse date - handle various formats
        let dateStr = row[dateColumnIndex];
        if (typeof dateStr === 'number') {
          // Excel date number
          const date = XLSX.SSF.parse_date_code(dateStr);
          dateStr = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        } else if (typeof dateStr === 'string') {
          // Try to parse string date
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            dateStr = parsedDate.toISOString().split('T')[0];
          }
        }
        
        // Parse revenue incl VAT
        let revenueInclVAT = 0;
        if (revenueInclVATColumnIndex !== -1 && row[revenueInclVATColumnIndex]) {
          if (typeof row[revenueInclVATColumnIndex] === 'number') {
            revenueInclVAT = row[revenueInclVATColumnIndex];
          } else if (typeof row[revenueInclVATColumnIndex] === 'string') {
            revenueInclVAT = parseFloat(row[revenueInclVATColumnIndex].replace(/[^\d.-]/g, '')) || 0;
          }
        }
        
        // Parse revenue excl VAT
        let revenueExclVAT = 0;
        if (revenueExclVATColumnIndex !== -1 && row[revenueExclVATColumnIndex]) {
          if (typeof row[revenueExclVATColumnIndex] === 'number') {
            revenueExclVAT = row[revenueExclVATColumnIndex];
          } else if (typeof row[revenueExclVATColumnIndex] === 'string') {
            revenueExclVAT = parseFloat(row[revenueExclVATColumnIndex].replace(/[^\d.-]/g, '')) || 0;
          }
        }
        
        if (dateStr && typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          results.push({
            date: dateStr,
            revenueInclVAT: revenueInclVAT,
            revenueExclVAT: revenueExclVAT
          });
        }
      } catch (error) {
        console.log(`[XLSX Parser] Error parsing row ${i}:`, error);
      }
    }
    
    console.log(`[XLSX Parser] Extracted ${results.length} data points from ${filePath}`);
    return results;
    
  } catch (error) {
    console.error(`[XLSX Parser] Error parsing file ${filePath}:`, error);
    return [];
  }
}

/**
 * Find column index by matching header names
 */
function findColumnIndex(headers: string[], searchTerms: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toLowerCase() || '';
    for (const term of searchTerms) {
      if (header.includes(term.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Get location data summary for a specific location
 */
export async function getLocationDataSummary(locationFolder: string): Promise<LocationData> {
  const locationMap = {
    'barbea': '550e8400-e29b-41d4-a716-446655440002',
    'kinsbergen': '550e8400-e29b-41d4-a716-446655440003',
    'lamour-toujours': '550e8400-e29b-41d4-a716-446655440001'
  };
  
  const locationId = locationMap[locationFolder as keyof typeof locationMap];
  const revenueData = await parseLocationQuarterlyFiles(locationFolder);
  const datesWithRevenue = new Set(revenueData.keys());
  
  return {
    locationId,
    datesWithRevenue,
    totalRevenue: 0 // We could calculate this if needed
  };
}
