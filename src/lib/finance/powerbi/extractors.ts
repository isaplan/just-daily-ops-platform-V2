import * as XLSX from "xlsx";
import { getDateRangeFromMonths } from "@/lib/monthConverter";

export interface LocationInfo {
  name: string;
  address?: string;
}

export interface DateRange {
  start: string;
  end: string;
}

/**
 * Extracts location name from PowerBI P&L workbook
 * Parses the filter row to find "AdministratieNaam" value
 */
export const extractPowerBILocation = (workbook: XLSX.WorkBook): LocationInfo | null => {
  try {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    const filtersRow = data[0]?.[0]?.toString() || '';
    const match = filtersRow.match(/\[AdministratieNaam\]\s+is\s+([^<\[]+)/i);
    
    if (match && match[1]) {
      const locationName = match[1].trim();
      return { name: locationName };
    }
  } catch (error) {
    console.error("Error extracting PowerBI location:", error);
  }
  return null;
};

/**
 * Extracts date range from PowerBI P&L workbook
 * Finds year from filter row and collects unique months from data
 */
export const extractPowerBIDateRange = (workbook: XLSX.WorkBook): DateRange | null => {
  try {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    const filtersRow = data[0]?.[0]?.toString() || '';
    const yearMatch = filtersRow.match(/\[Kalender'\[Jaar\]\]\s+is\s+(\d{4})/i);
    
    if (!yearMatch) return null;
    const year = parseInt(yearMatch[1]);
    
    const months = new Set<string>();
    for (let i = 2; i < data.length; i++) {
      const monthValue = data[i]?.[5];
      if (monthValue) {
        months.add(monthValue.toString().toLowerCase());
      }
    }
    
    return getDateRangeFromMonths(year, Array.from(months));
  } catch (error) {
    console.error("Error extracting PowerBI date range:", error);
  }
  return null;
};
