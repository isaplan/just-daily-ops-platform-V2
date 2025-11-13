/**
 * P&L Calculation Service
 * 
 * Handles calculations for Profit & Loss data with proper COGS category mapping
 * and validation against PowerBI screenshots.
 */

export interface PnLData {
  category: string;
  subcategory: string | null;
  gl_account: string;
  amount: number;
  month: number;
  location_id: string;
  year: number;
}

export interface PnLCalculation {
  revenue: number;
  costs: {
    kostprijs: number;
    personeel: number;
    overige: number; // CRITICAL - must be included!
    afschrijvingen: number;
    financieel: number;
  };
  opbrengst: number; // Kinsbergen only
  totalCosts: number;
  resultaat: number;
  validation: {
    isValid: boolean;
    errorMargin: number;
    missingCategories: string[];
  };
}

/**
 * Calculate monthly P&L for a specific month and location
 */
export function calculateMonthlyPnL(
  data: PnLData[],
  month: number,
  locationId?: string
): PnLCalculation {
  // Filter data for the specific month and location
  let monthData = data.filter(d => d.month === month);
  if (locationId) {
    monthData = monthData.filter(d => d.location_id === locationId);
  }
  
  // Revenue (positive) - map multiple revenue categories
  const revenue = 
    sumCategory(monthData, 'Netto-omzet uit leveringen geproduceerde goederen') +
    sumCategory(monthData, 'Netto-omzet uit verkoop van handelsgoederen') +
    sumCategory(monthData, 'Netto-omzet groepen');
  
  const opbrengst = sumCategory(monthData, 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten');
  
  // Costs (all negative in database) - map detailed categories to main COGS
  const costs = {
    kostprijs: sumCategory(monthData, 'Inkoopwaarde handelsgoederen'),
    personeel: 
      sumCategory(monthData, 'Lonen en salarissen') +
      sumCategory(monthData, 'Overige lasten uit hoofde van personeelsbeloningen') +
      sumCategory(monthData, 'Overige personeelsgerelateerde kosten') +
      sumCategory(monthData, 'Pensioenlasten') +
      sumCategory(monthData, 'Sociale lasten') +
      sumCategory(monthData, 'Werkkostenregeling - detail'),
    overige: 
      sumCategory(monthData, 'Accountants- en advieskosten') +
      sumCategory(monthData, 'Administratieve lasten') +
      sumCategory(monthData, 'Andere kosten') +
      sumCategory(monthData, 'Assurantiekosten') +
      sumCategory(monthData, 'Autokosten') +
      sumCategory(monthData, 'Exploitatie- en machinekosten') +
      sumCategory(monthData, 'Huisvestingskosten') +
      sumCategory(monthData, 'Kantoorkosten') +
      sumCategory(monthData, 'Verkoop gerelateerde kosten'),
    afschrijvingen: 
      sumCategory(monthData, 'Afschrijvingen op immateriële vaste activa') +
      sumCategory(monthData, 'Afschrijvingen op materiële vaste activa'),
    financieel: 
      sumCategory(monthData, 'Rentelasten en soortgelijke kosten') +
      sumCategory(monthData, 'Rentebaten en soortgelijke opbrengsten') +
      sumCategory(monthData, 'Rente belastingen')
  };
  
  const totalCosts = Object.values(costs).reduce((sum, val) => sum + val, 0);
  const resultaat = revenue + opbrengst + totalCosts; // Costs are negative
  
  // Validation
  const missingCategories = Object.entries(costs)
    .filter(([key, value]) => value === 0)
    .map(([key]) => key);
  
  const validation = {
    isValid: missingCategories.length === 0,
    errorMargin: 0, // Will be calculated by validatePnLCalculation
    missingCategories
  };
  
  return { revenue, costs, opbrengst, totalCosts, resultaat, validation };
}

/**
 * Calculate P&L for all months in the data
 */
export function calculateAllMonthsPnL(data: PnLData[]): Map<number, PnLCalculation> {
  const results = new Map<number, PnLCalculation>();
  const months = [...new Set(data.map(d => d.month))].sort();
  
  months.forEach(month => {
    results.set(month, calculateMonthlyPnL(data, month));
  });
  
  return results;
}

/**
 * Calculate P&L for all locations in the data
 */
export function calculateAllLocationsPnL(data: PnLData[]): Map<string, Map<number, PnLCalculation>> {
  const results = new Map<string, Map<number, PnLCalculation>>();
  const locations = [...new Set(data.map(d => d.location_id))];
  
  locations.forEach(locationId => {
    const locationData = data.filter(d => d.location_id === locationId);
    const months = [...new Set(locationData.map(d => d.month))].sort();
    const monthResults = new Map<number, PnLCalculation>();
    
    months.forEach(month => {
      monthResults.set(month, calculateMonthlyPnL(locationData, month, locationId));
    });
    
    results.set(locationId, monthResults);
  });
  
  return results;
}

/**
 * Validate P&L calculation against expected result
 */
export function validatePnLCalculation(
  calculated: PnLCalculation,
  expected: number,
  tolerance: number = 0.005 // 0.5% error margin
): {
  isValid: boolean;
  errorMargin: number;
  difference: number;
  message: string;
} {
  const difference = Math.abs(calculated.resultaat - expected);
  const errorMargin = expected !== 0 ? Math.abs(difference / expected) : (difference === 0 ? 0 : 1);
  const isValid = errorMargin <= tolerance;
  
  let message = '';
  if (isValid) {
    message = `P&L calculation is within ${(tolerance * 100).toFixed(1)}% error margin.`;
  } else {
    message = `P&L calculation exceeds ${(tolerance * 100).toFixed(1)}% error margin. Expected: ${expected}, Calculated: ${calculated.resultaat.toFixed(2)}, Error: ${(errorMargin * 100).toFixed(2)}%`;
  }
  
  return { isValid, errorMargin, difference, message };
}

/**
 * Helper function to sum amounts for a specific category
 */
function sumCategory(data: PnLData[], category: string): number {
  return data
    .filter(d => d.category === category)
    .reduce((sum, d) => sum + d.amount, 0);
}

/**
 * Get all unique categories in the data
 */
export function getAvailableCategories(data: PnLData[]): string[] {
  const categories = [...new Set(data.map(d => d.category))];
  const glAccounts = [...new Set(data.map(d => d.gl_account))];
  return [...categories, ...glAccounts].sort();
}

/**
 * Get all unique subcategories for a specific category
 */
export function getSubcategoriesForCategory(data: PnLData[], category: string): string[] {
  return [...new Set(
    data
      .filter(d => d.category === category && d.subcategory)
      .map(d => d.subcategory!)
  )].sort();
}

/**
 * Get all unique GL accounts for a specific category
 */
export function getGLAccountsForCategory(data: PnLData[], category: string): string[] {
  return [...new Set(
    data
      .filter(d => d.category === category)
      .map(d => d.gl_account)
  )].sort();
}

