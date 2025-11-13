/**
 * P&L Data Extractor
 * 
 * Extracts raw data for validation and testing
 * Modular functions for debugging
 */

import { createClient } from '@/integrations/supabase/server';

export interface TestCase {
  locationId: string;
  locationName: string;
  year: number;
  month: number;
  expectedResultaat?: number;
}

export interface ExtractedData {
  locationId: string;
  year: number;
  month: number;
  rawData: Array<{
    category: string;
    subcategory: string | null;
    gl_account: string;
    amount: number;
  }>;
  totals: {
    revenue: number;
    costOfSales: number;
    laborCost: number;
    otherCosts: number;
    calculatedResultaat: number;
  };
}

/**
 * Extract raw P&L data for a specific location, year, month
 */
export async function extractPnLData(
  locationId: string,
  year: number,
  month: number
): Promise<ExtractedData> {
  const supabase = await createClient();
  
  const { data: rawData, error } = await supabase
    .from('powerbi_pnl_data')
    .select('category, subcategory, gl_account, amount')
    .eq('location_id', locationId)
    .eq('year', year)
    .eq('month', month);
    
  if (error) {
    throw new Error(`Failed to extract data: ${error.message}`);
  }
  
  // Calculate totals
  const revenue = rawData
    ?.filter(d => d.amount > 0)
    .reduce((sum, d) => sum + d.amount, 0) || 0;
    
  const costs = rawData
    ?.filter(d => d.amount < 0)
    .reduce((sum, d) => sum + d.amount, 0) || 0;
  
  // Calculate by category groups (simplified - will be enhanced)
  const costOfSales = rawData
    ?.filter(d => d.category.includes('Inkoop') || d.category.includes('Kostprijs'))
    .reduce((sum, d) => sum + d.amount, 0) || 0;
    
  const laborCost = rawData
    ?.filter(d => d.category.includes('Lonen') || d.category.includes('Arbeid') || d.category.includes('Labor'))
    .reduce((sum, d) => sum + d.amount, 0) || 0;
    
  const otherCosts = costs - costOfSales - laborCost;
  
  const calculatedResultaat = revenue + costs; // Costs are negative
  
  return {
    locationId,
    year,
    month,
    rawData: rawData || [],
    totals: {
      revenue,
      costOfSales,
      laborCost,
      otherCosts,
      calculatedResultaat
    }
  };
}

/**
 * Extract data for multiple test cases
 */
export async function extractTestCases(cases: TestCase[]): Promise<ExtractedData[]> {
  const results: ExtractedData[] = [];
  
  for (const testCase of cases) {
    try {
      const data = await extractPnLData(
        testCase.locationId,
        testCase.year,
        testCase.month
      );
      results.push(data);
    } catch (error) {
      console.error(`Failed to extract data for ${testCase.locationName} ${testCase.year}-${testCase.month}:`, error);
    }
  }
  
  return results;
}

/**
 * Get available months for a location/year
 */
export async function getAvailableMonths(
  locationId: string,
  year: number
): Promise<number[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('powerbi_pnl_data')
    .select('month')
    .eq('location_id', locationId)
    .eq('year', year);
    
  if (error) {
    throw new Error(`Failed to get months: ${error.message}`);
  }
  
  return [...new Set(data?.map(d => d.month) || [])].sort((a, b) => a - b);
}

