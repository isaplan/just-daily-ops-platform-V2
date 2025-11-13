import { FIELD_SYNONYMS } from '../config/fieldSynonyms';
import { normalizeHeader } from './headerNormalizer';

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Match field name to normalized header using synonyms and fuzzy matching
 * Returns confidence score 0.0-1.0
 */
export function matchField(normalizedHeader: string, field: string): number {
  // Guard against undefined or empty normalized headers
  if (!normalizedHeader || typeof normalizedHeader !== 'string' || normalizedHeader.trim() === '') {
    return 0.0;
  }
  
  const synonyms = FIELD_SYNONYMS[field] || [];
  
  // 1. Check if normalized header exactly matches the field name itself
  if (normalizedHeader === field) {
    return 1.0;
  }
  
  // 2. Exact match against synonyms
  for (const synonym of synonyms) {
    if (normalizedHeader === normalizeHeader(synonym)) {
      return 1.0;
    }
  }
  
  // 3. Partial match (contains)
  for (const synonym of synonyms) {
    const normSynonym = normalizeHeader(synonym);
    if (normalizedHeader.includes(normSynonym) || normSynonym.includes(normalizedHeader)) {
      return 0.85;
    }
  }
  
  // 4. Fuzzy match (Levenshtein distance <= 2)
  for (const synonym of synonyms) {
    const normSynonym = normalizeHeader(synonym);
    const distance = levenshteinDistance(normalizedHeader, normSynonym);
    if (distance <= 2) {
      return Math.max(0.65, 1.0 - (distance * 0.15));
    }
  }
  
  return 0.0;
}
