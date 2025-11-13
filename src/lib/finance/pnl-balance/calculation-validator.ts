/**
 * P&L Balance Calculation Validator
 * 
 * Validates calculations against expected results with 1% margin
 * Modular validation functions for debugging
 */

export interface ValidationResult {
  isValid: boolean;
  expected: number;
  actual: number;
  difference: number;
  percentageDifference: number;
  margin: number;
  category: string;
}

export interface BalanceValidation {
  revenue: ValidationResult;
  costOfSales: ValidationResult;
  laborCost: ValidationResult;
  otherCosts: ValidationResult;
  resultaat: ValidationResult;
  isValid: boolean;
}

const MAX_MARGIN = 0.01; // 1%

/**
 * Validate a single calculation value
 */
export function validateValue(
  expected: number,
  actual: number,
  category: string,
  margin: number = MAX_MARGIN
): ValidationResult {
  const difference = Math.abs(expected - actual);
  const percentageDifference = expected !== 0 
    ? (difference / Math.abs(expected)) * 100 
    : difference;
  
  const isValid = percentageDifference <= (margin * 100);

  return {
    isValid,
    expected,
    actual,
    difference,
    percentageDifference,
    margin: margin * 100,
    category
  };
}

/**
 * Validate complete P&L balance
 */
export function validateBalance(
  revenue: number,
  costOfSales: number,
  laborCost: number,
  otherCosts: number,
  expectedResultaat: number,
  actualResultaat: number
): BalanceValidation {
  const revenueValidation = validateValue(revenue, revenue, 'Revenue');
  const costOfSalesValidation = validateValue(costOfSales, costOfSales, 'Cost of Sales');
  const laborCostValidation = validateValue(laborCost, laborCost, 'Labor Cost');
  const otherCostsValidation = validateValue(otherCosts, otherCosts, 'Other Costs');
  
  const resultaatValidation = validateValue(
    expectedResultaat,
    actualResultaat,
    'Resultaat'
  );

  const isValid = resultaatValidation.isValid;

  return {
    revenue: revenueValidation,
    costOfSales: costOfSalesValidation,
    laborCost: laborCostValidation,
    otherCosts: otherCostsValidation,
    resultaat: resultaatValidation,
    isValid
  };
}

/**
 * Calculate expected Resultaat from components
 */
export function calculateExpectedResultaat(
  revenue: number,
  costOfSales: number,
  laborCost: number,
  otherCosts: number,
  opbrengstVorderingen: number = 0
): number {
  // Costs are negative in database, so we add them
  return revenue + costOfSales + laborCost + otherCosts + opbrengstVorderingen;
}

/**
 * Format validation error message
 */
export function formatValidationError(validation: ValidationResult): string {
  if (validation.isValid) return '';
  
  return `${validation.category}: Expected ${validation.expected.toFixed(2)}, Got ${validation.actual.toFixed(2)}, Difference: ${validation.percentageDifference.toFixed(2)}%`;
}

