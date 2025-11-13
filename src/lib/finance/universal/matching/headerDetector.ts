import * as XLSX from 'xlsx';
import { ImportType } from '../types';
import { FIELD_SYNONYMS } from '../config/fieldSynonyms';
import { METADATA_BLACKLIST } from '../config/constants';
import { normalizeHeader } from './headerNormalizer';
import { matchField } from './fuzzyMatcher';

/**
 * Detect header row in Excel sheet
 * Returns row index where header is located
 */
export function detectHeaderRow(sheet: XLSX.WorkSheet, importType?: ImportType): number {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const maxRowsToScan = Math.min(50, data.length);
  
  console.log(`🔍 Analyzing potential header rows (scanning ${maxRowsToScan} rows)...`);
  
  let bestRow = 0;
  let bestScore = 0;
  let bestRecognitionRate = 0;
  
  for (let i = 0; i < maxRowsToScan; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    let score = 0;
    let textCount = 0;
    let recognizedFieldsCount = 0;
    const uniqueValues = new Set<string>();
    let isMetadataRow = false;
    
    // Check up to 13 columns (covers most Eitje files)
    for (let col = 0; col < Math.min(row.length, 13); col++) {
      const cell = row[col];
      if (!cell) continue;
      
      const value = String(cell).trim();
      
      // Check metadata blacklist - INSTANT SKIP
      for (const blacklisted of METADATA_BLACKLIST) {
        if (value.includes(blacklisted)) {
          isMetadataRow = true;
          score -= 100;
          break;
        }
      }
      
      if (isMetadataRow) break;
      
      // Strong penalty for very long headers (>50 chars) - likely metadata descriptions
      if (value.length > 50) {
        score -= 20;
      }
      
      // Check if this header matches any known field synonyms
      const normalizedValue = normalizeHeader(value);
      let matchesKnownField = false;
      
      for (const field of Object.keys(FIELD_SYNONYMS)) {
        const matchConfidence = matchField(normalizedValue, field);
        if (matchConfidence > 0.5) {
          matchesKnownField = true;
          recognizedFieldsCount++;
          break;
        }
      }
      
      // Bonus for header-like patterns (with or without sort symbols ▲▼)
      if (value.match(/^[▲▼]?\s*(datum|date|naam|name|omzet|revenue|uren|hours|team|kosten|cost|groep|productiviteit|loonkosten)/i)) {
        score += 5;
      }
      
      // Extra bonus for recognized fields
      if (matchesKnownField) {
        score += 8;
      }
      
      // Clean special sort symbols for uniqueness check
      const cleaned = value.replace(/^[▲▼]\s*/, '');
      
      if (cleaned.length > 0) {
        textCount++;
        uniqueValues.add(cleaned.toLowerCase());
      }
    }
    
    // Skip if metadata row detected
    if (isMetadataRow) {
      console.log(`   ⏭️ Row ${i}: SKIPPED (metadata blacklist match)`);
      continue;
    }
    
    // Calculate recognition rate
    const recognitionRate = textCount > 0 ? recognizedFieldsCount / textCount : 0;
    
    // More text columns = better candidate
    score += textCount * 2;
    
    // All unique values = better candidate
    if (textCount > 0 && uniqueValues.size === textCount) {
      score += 5;
    }
    
    // CRITICAL: Require at least 50% of headers to be recognizable fields AND minimum 3 recognized fields
    // This prevents metadata rows from being selected as headers
    const meetsRecognitionThreshold = recognitionRate >= 0.5 && recognizedFieldsCount >= 3;
    
    if (textCount >= 4 && meetsRecognitionThreshold && score > bestScore) {
      console.log(`   ✅ Row ${i}: ${recognizedFieldsCount}/${textCount} recognized (${(recognitionRate * 100).toFixed(0)}%) - score: ${score}`);
      bestScore = score;
      bestRow = i;
      bestRecognitionRate = recognitionRate;
    } else if (textCount >= 4) {
      console.log(`   ⏭️ Row ${i}: ${recognizedFieldsCount}/${textCount} recognized (${(recognitionRate * 100).toFixed(0)}%) - SKIPPED (below 50% threshold or <3 fields)`);
    }
  }
  
  console.log(`✅ Selected header row: ${bestRow} (score: ${bestScore}, recognition: ${(bestRecognitionRate * 100).toFixed(0)}%)`);
  return bestRow;
}
