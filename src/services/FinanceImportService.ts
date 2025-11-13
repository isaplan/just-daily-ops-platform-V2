import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSheet } from "@/lib/finance/universal/analysis/sheetAnalyzer";
import { detectFileType, type ImportType } from "@/lib/finance/common/file-detector";
import { extractBorkLocation } from "@/lib/finance/bork/extractors";
import { extractPowerBILocation } from "@/lib/finance/powerbi/extractors";
import type { AnalysisResult } from "@/lib/finance/universal/types";

export class FinanceImportService {
  /**
   * Analyze uploaded file and return import metadata
   */
  static async analyzeFile(file: File): Promise<{
    workbook: XLSX.WorkBook;
    importType: ImportType;
    analysis: AnalysisResult;
    extractedLocation: { name: string; address?: string } | null;
  }> {
    console.log('[FinanceImportService] Starting file analysis:', file.name);
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const importType = detectFileType(workbook, file.name);

    if (!importType) {
      throw new Error("Could not detect file type");
    }

    console.log('[FinanceImportService] Detected import type:', importType);

    const analysis = analyzeSheet(workbook, importType);

    let extractedLocation = null;
    if (importType === 'bork_sales') {
      extractedLocation = extractBorkLocation(workbook);
      console.log('[FinanceImportService] Extracted Bork location:', extractedLocation);
    } else if (importType === 'powerbi_pnl') {
      extractedLocation = extractPowerBILocation(workbook);
      console.log('[FinanceImportService] Extracted PowerBI location:', extractedLocation);
    }

    return { workbook, importType, analysis, extractedLocation };
  }

  /**
   * Process import using edge function (transactional)
   */
  static async processImport(
    importId: string,
    importType: ImportType,
    locationId: string,
    records: any[]
  ): Promise<{ processedCount: number; errors: any[] }> {
    console.log('[FinanceImportService] Processing import via edge function:', {
      importId,
      importType,
      locationId,
      recordCount: records.length
    });

    const { data, error } = await supabase.functions.invoke('finance-import-orchestrator', {
      body: { importId, importType, locationId, records }
    });

    if (error) {
      console.error('[FinanceImportService] Edge function error:', error);
      throw error;
    }

    console.log('[FinanceImportService] Import completed:', data);
    return data;
  }

  /**
   * Validate records before import
   */
  static async validateRecords(
    importType: ImportType,
    records: any[]
  ): Promise<{ valid: boolean; errors: any[]; validCount: number }> {
    console.log('[FinanceImportService] Validating records:', {
      importType,
      recordCount: records.length
    });

    const { data, error } = await supabase.functions.invoke('finance-validation-middleware', {
      body: { importType, records }
    });

    if (error) {
      console.error('[FinanceImportService] Validation error:', error);
      throw error;
    }

    console.log('[FinanceImportService] Validation results:', data);
    return data;
  }
}
