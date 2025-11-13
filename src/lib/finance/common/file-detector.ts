import * as XLSX from "xlsx";

export type ImportType = 'bork_sales' | 'eitje_productivity' | 'eitje_labor' | 'powerbi_pnl';

/**
 * Detects import type from workbook structure and filename
 * Checks filename patterns first, then analyzes worksheet content
 */
export const detectFileType = (workbook: XLSX.WorkBook, fileName: string): ImportType | null => {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  
  // Check filename patterns first
  if (fileName.toLowerCase().startsWith('powerbi-')) {
    return 'powerbi_pnl';
  }
  
  if (fileName.toLowerCase().includes('eitje-financien')) {
    return 'eitje_productivity';
  }
  
  if (fileName.toLowerCase().includes('eitje-gewerkte-uren')) {
    return 'eitje_labor';
  }
  
  if (fileName.toLowerCase().includes('basis_rapport') || 
      data[0]?.[0]?.toString().toLowerCase().includes('basis rapport')) {
    return 'bork_sales';
  }
  
  // Analyze content for PowerBI
  const firstRow = data[0]?.[0]?.toString().toLowerCase() || '';
  const headerRow = data[7];
  
  if (firstRow.includes('toegepaste filters') || firstRow.includes('[grootboektype]')) {
    return 'powerbi_pnl';
  }
  
  if (headerRow && Array.isArray(headerRow)) {
    const hasRGSSchema = headerRow.some((cell: any) => 
      cell?.toString().includes('RGS-Schema') || cell?.toString().includes('RGSNiveau')
    );
    if (hasRGSSchema) {
      return 'powerbi_pnl';
    }
  }
  
  return null;
};
