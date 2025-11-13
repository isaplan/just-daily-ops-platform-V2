import { ImportType, FieldMapping } from '../types';
import { FIELD_REQUIREMENTS } from '../config/fieldRequirements';
import { normalizeHeader } from '../matching/headerNormalizer';
import { matchField } from '../matching/fuzzyMatcher';

/**
 * Build proposed field mapping from detected headers
 */
export function buildProposedMapping(
  headers: string[],
  normalizedHeaders: string[],
  importType: ImportType
): {
  mapping: FieldMapping;
  confidence: Record<string, number>;
} {
  const requirements = FIELD_REQUIREMENTS[importType];
  const allFields = [...requirements.required, ...requirements.optional];
  
  const proposedMapping: FieldMapping = {};
  const confidence: Record<string, number> = {};
  
  // Match each field to best header
  for (const field of allFields) {
    let bestHeader = '';
    let bestConfidence = 0;
    
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const conf = matchField(normalizedHeaders[i], field);
      if (conf > bestConfidence) {
        bestConfidence = conf;
        bestHeader = headers[i];
      }
    }
    
    if (bestConfidence > 0.5) {
      proposedMapping[field] = bestHeader;
      confidence[field] = bestConfidence;
    }
  }
  
  // PowerBI-specific fallback: Detect standard 6-column structure
  if (importType === 'powerbi_pnl' && headers.length === 6) {
    const powerbiTemplate: Record<string, number> = {
      gl_account: 0,    // Column A: 'RGS-Schema'[RGSNiveau2]
      category: 1,      // Column B: 'RGS-Schema'[RGSNiveau3]
      subcategory: 2,   // Column C: Grootboek
      amount: 3,        // Column D: Forecast
      year: 4,          // Column E: 'Kalender2'[Jaar]
      month: 5          // Column F: Mnd
    };
    
    // Apply template if we have low confidence on required fields
    const lowConfidenceFields = requirements.required.filter(
      field => !proposedMapping[field] || confidence[field] < 0.6
    );
    
    if (lowConfidenceFields.length > 0) {
      console.log('📊 Applying PowerBI 6-column template mapping');
      for (const [field, index] of Object.entries(powerbiTemplate)) {
        if (!proposedMapping[field] && headers[index]) {
          proposedMapping[field] = headers[index];
          confidence[field] = 0.85;
          console.log(`✅ Template match: ${field} → ${headers[index]} (column ${index + 1})`);
        }
      }
    }
  }
  
  // Fallback: Check for any unmapped required fields and try harder
  const unmappedRequired = requirements.required.filter(field => !proposedMapping[field]);
  
  if (unmappedRequired.length > 0) {
    console.warn('⚠️ Unmapped required fields, trying fallback matching:', unmappedRequired);
    
    for (const field of unmappedRequired) {
      // Try to find any header that contains the field name
      for (let i = 0; i < normalizedHeaders.length; i++) {
        const normHeader = normalizedHeaders[i];
        
        // Skip if normHeader is undefined or empty
        if (!normHeader || typeof normHeader !== 'string') {
          continue;
        }
        
        const fieldParts = field.split('_');
        
        // Check if all parts of the field name are in the header
        const allPartsMatch = fieldParts.every(part => 
          normHeader.includes(part) || part.includes(normHeader)
        );
        
        if (allPartsMatch && !Object.values(proposedMapping).includes(headers[i])) {
          console.log(`✅ Fallback match: ${field} → ${headers[i]} (normalized: ${normHeader})`);
          proposedMapping[field] = headers[i];
          confidence[field] = 0.7;
          break;
        }
      }
    }
  }
  
  return { mapping: proposedMapping, confidence };
}
