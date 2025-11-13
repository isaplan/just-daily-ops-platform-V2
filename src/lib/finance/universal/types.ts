export type ImportType = 'bork_sales' | 'eitje_labor' | 'eitje_productivity' | 'powerbi_pnl';

export type FieldMapping = Record<string, string>; // { dbField: excelColumn }

export interface AnalysisResult {
  importType: ImportType;
  detectedHeaderRow: number;
  headers: string[];
  normalizedHeaders: string[];
  proposedMapping: FieldMapping;
  confidence: Record<string, number>; // field -> 0-1 confidence
  sampleRows: any[]; // first 5 rows for preview
  requiredFields: string[];
  optionalFields: string[];
}

export interface ValidationError {
  rowIndex: number;
  reason: string;
  field?: string;
  value?: any;
  originalRow?: any;
}

export interface ProcessingResult {
  processedCount: number;
  skippedCount: number;
  errors: ValidationError[];
}