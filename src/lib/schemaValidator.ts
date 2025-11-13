export interface ColumnMapping {
  excelColumn: string;
  dbColumn: string;
  isRequired: boolean;
  transform?: (value: any) => any;
}

export interface ValidationResult {
  isValid: boolean;
  missingRequired: string[];
  extraColumns: string[];
  suggestions: Array<{
    excelColumn: string;
    suggestedDbColumn: string;
    confidence: number;
  }>;
}

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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
  
  return matrix[str2.length][str1.length];
};

const normalizeColumnName = (name: string): string => {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
};

export const suggestColumnMapping = (
  unknownColumn: string,
  availableDbColumns: string[]
): { column: string; confidence: number } | null => {
  const normalized = normalizeColumnName(unknownColumn);
  let bestMatch: { column: string; confidence: number } | null = null;
  
  for (const dbColumn of availableDbColumns) {
    const distance = levenshteinDistance(normalized, normalizeColumnName(dbColumn));
    const maxLength = Math.max(normalized.length, dbColumn.length);
    const confidence = 1 - (distance / maxLength);
    
    if (confidence > 0.6 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { column: dbColumn, confidence };
    }
  }
  
  return bestMatch;
};

export const validateSchema = (
  excelHeaders: string[],
  expectedColumns: ColumnMapping[]
): ValidationResult => {
  const normalizedExcelHeaders = excelHeaders.map(h => normalizeColumnName(h));
  const missingRequired: string[] = [];
  const extraColumns: string[] = [];
  const suggestions: Array<{
    excelColumn: string;
    suggestedDbColumn: string;
    confidence: number;
  }> = [];
  
  // Check for missing required columns
  for (const expected of expectedColumns) {
    if (expected.isRequired) {
      const normalized = normalizeColumnName(expected.dbColumn);
      const found = normalizedExcelHeaders.includes(normalized);
      if (!found) {
        missingRequired.push(expected.dbColumn);
      }
    }
  }
  
  // Check for extra columns and suggest mappings
  const expectedDbColumns = expectedColumns.map(c => c.dbColumn);
  for (let i = 0; i < excelHeaders.length; i++) {
    const excelHeader = excelHeaders[i];
    const normalized = normalizedExcelHeaders[i];
    
    const isExpected = expectedColumns.some(
      ec => normalizeColumnName(ec.dbColumn) === normalized
    );
    
    if (!isExpected) {
      extraColumns.push(excelHeader);
      const suggestion = suggestColumnMapping(excelHeader, expectedDbColumns);
      if (suggestion) {
        suggestions.push({
          excelColumn: excelHeader,
          suggestedDbColumn: suggestion.column,
          confidence: suggestion.confidence,
        });
      }
    }
  }
  
  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    extraColumns,
    suggestions,
  };
};

export const generateMigration = (
  tableName: string,
  newColumns: Array<{
    name: string;
    type: 'text' | 'numeric' | 'date' | 'boolean' | 'timestamp';
    nullable: boolean;
  }>
): string => {
  const columnDefinitions = newColumns.map(col => {
    const typeMap = {
      text: 'TEXT',
      numeric: 'NUMERIC',
      date: 'DATE',
      boolean: 'BOOLEAN',
      timestamp: 'TIMESTAMP WITH TIME ZONE',
    };
    const nullConstraint = col.nullable ? '' : ' NOT NULL';
    return `  ADD COLUMN ${col.name} ${typeMap[col.type]}${nullConstraint}`;
  });
  
  return `ALTER TABLE ${tableName}\n${columnDefinitions.join(',\n')};`;
};
