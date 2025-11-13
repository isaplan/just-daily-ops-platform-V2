import * as XLSX from 'xlsx';
import { ImportType, AnalysisResult } from '../types';
import { FIELD_REQUIREMENTS } from '../config/fieldRequirements';
import { normalizeHeader } from '../matching/headerNormalizer';
import { detectHeaderRow } from '../matching/headerDetector';
import { buildProposedMapping } from './mappingBuilder';

/**
 * Analyze Excel sheet and propose field mapping
 * Main entry point for file analysis
 */
export function analyzeSheet(
  workbook: XLSX.WorkBook,
  importType: ImportType
): AnalysisResult {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const headerRow = detectHeaderRow(firstSheet, importType);
  
  console.log('📊 Sheet Analysis START:', {
    importType,
    detectedHeaderRow: headerRow,
    sheetName: workbook.SheetNames[0]
  });
  
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
  
  const headers = data[headerRow] || [];
  const normalizedHeaders = headers.map(h => normalizeHeader(h));
  
  console.log('📋 Headers found:', {
    row: headerRow,
    count: headers.length,
    headers: headers,
    normalized: normalizedHeaders
  });
  
  const requirements = FIELD_REQUIREMENTS[importType];
  const { mapping: proposedMapping, confidence } = buildProposedMapping(headers, normalizedHeaders, importType);
  
  // Validate header row quality
  const recognizedHeaderCount = Object.keys(proposedMapping).length;
  const totalHeaderCount = headers.filter(h => h && String(h).trim().length > 0).length;
  const recognitionRate = totalHeaderCount > 0 ? recognizedHeaderCount / totalHeaderCount : 0;
  
  console.log(`🗺️ Mapping created: ${recognizedHeaderCount}/${totalHeaderCount} headers mapped (${(recognitionRate * 100).toFixed(0)}%)`);
  console.log('   Proposed mapping:', proposedMapping);
  
  // Validate that we have enough recognized headers
  if (recognitionRate < 0.25) {
    const missingFields = requirements.required.filter(f => !proposedMapping[f]);
    throw new Error(
      `Header row validation failed. Only ${recognizedHeaderCount}/${totalHeaderCount} headers recognized (${(recognitionRate * 100).toFixed(0)}%). ` +
      `Expected headers like: ${requirements.required.join(', ')}. ` +
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
  
  // Detailed logging for Eitje files
  if (importType === 'eitje_labor' || importType === 'eitje_productivity') {
    console.log('📊 Eitje File Analysis:', {
      importType,
      detectedHeaders: headers,
      normalizedHeaders,
      proposedMapping,
      confidence,
      requiredFields: requirements.required,
      missingRequired: requirements.required.filter(f => !proposedMapping[f])
    });
  }
  
  // Extract sample rows
  const sampleRows = data
    .slice(headerRow + 1, headerRow + 6)
    .filter(row => row && row.length > 0);
  
  console.log('🎯 Proposed Mapping FINAL:', {
    mapping: proposedMapping,
    mappedFieldCount: Object.keys(proposedMapping).length,
    requiredFieldCount: requirements.required.length,
    confidenceScores: confidence
  });
  
  return {
    importType,
    detectedHeaderRow: headerRow,
    headers,
    normalizedHeaders,
    proposedMapping,
    confidence,
    sampleRows,
    requiredFields: requirements.required,
    optionalFields: requirements.optional
  };
}
