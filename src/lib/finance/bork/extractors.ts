import * as XLSX from "xlsx";

export interface LocationInfo {
  name: string;
  address?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Extracts location name and address from Bork sales workbook
 * Location is in row 3, address in row 4
 */
export const extractBorkLocation = (workbook: XLSX.WorkBook): LocationInfo | null => {
  try {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    let locationName = data[3]?.[0]?.toString().trim();
    const address = data[4]?.[0]?.toString().trim();
    
    console.log('🔍 [Bork] Raw extracted location:', { 
      row3: data[3]?.[0], 
      locationName, 
      address 
    });
    
    if (locationName) {
      // Handle formats like "HNG - Location Name" or "Location Name (Details)"
      // Extract the main location name part
      if (locationName.includes(' - ')) {
        const parts = locationName.split(' - ');
        locationName = parts[parts.length - 1].trim(); // Take the part after " - "
        console.log('🔍 [Bork] Cleaned location name (removed prefix):', locationName);
      }
      
      // Remove parenthetical details if present
      locationName = locationName.replace(/\s*\([^)]*\)\s*/g, '').trim();
      
      console.log('🔍 [Bork] Final extracted location:', { name: locationName, address });
      return { name: locationName, address };
    }
    
    console.warn('⚠️ [Bork] No location name found in row 3');
  } catch (error) {
    console.error("❌ [Bork] Error extracting location:", error);
  }
  return null;
};

/**
 * Extracts date range from Bork sales workbook
 * Searches first 10 rows for date pattern "DD/MM/YYYY - DD/MM/YYYY"
 */
export const extractBorkDateRange = (workbook: XLSX.WorkBook): DateRange | null => {
  try {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    for (let i = 0; i < 10; i++) {
      const row = data[i]?.[0]?.toString() || '';
      const dateMatch = row.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
      
      if (dateMatch) {
        const [, startStr, endStr] = dateMatch;
        const [startDay, startMonth, startYear] = startStr.split('/').map(Number);
        const [endDay, endMonth, endYear] = endStr.split('/').map(Number);
        
        return {
          start: `${startYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`,
          end: `${endYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`,
        };
      }
    }
  } catch (error) {
    console.error("Error extracting Bork date range:", error);
  }
  return null;
};
