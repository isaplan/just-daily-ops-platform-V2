import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { parseAllLocationData } from '@/lib/bork/xlsx-parser';

interface RevenueMismatch {
  date: string;
  referenceRevenue: number;
  databaseRevenue: number;
  difference: number;
  percentageDiff: number;
  severity: 'exact' | 'minor' | 'major';
}

interface RevenueValidationResult {
  locationId: string;
  locationName: string;
  matchedField: 'incl_vat' | 'excl_vat';
  mismatches: RevenueMismatch[];
  totalDates: number;
  exactMatches: number;
  minorMismatches: number;
  majorMismatches: number;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API /bork/validate-revenue] Starting revenue validation...');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Parse reference data from XLSX files
    console.log('[API /bork/validate-revenue] Parsing XLSX reference data...');
    const referenceData = await parseAllLocationData();
    
    // Get locations from existing API
    const locationsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/locations`);
    const locationsResult = await locationsResponse.json();
    
    if (!locationsResult.success || !locationsResult.data) {
      console.error('[API /bork/validate-revenue] Error fetching locations:', locationsResult.error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch locations' 
      }, { status: 500 });
    }
    
    const locations = locationsResult.data;
    
    const results: RevenueValidationResult[] = [];
    
    // Location name mapping
    const locationNames: Record<string, string> = {
      '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
      '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen',
      '550e8400-e29b-41d4-a716-446655440003': "L'Amour Toujours"
    };
    
    // Create supabase client for database queries
    const supabase = await createClient();
    
    // If specific location requested, validate only that one
    if (locationId) {
      const location = locations?.find((loc: { id: string; }) => loc.id === locationId);
      if (!location) {
        return NextResponse.json({ 
          success: false, 
          error: `Location ${locationId} not found` 
        }, { status: 404 });
      }
      
      const result = await validateLocationRevenue(
        supabase, 
        { id: location.id, name: locationNames[location.id] || 'Unknown' }, 
        referenceData.get(locationId) || new Map(),
        startDate,
        endDate
      );
      results.push(result);
    } else {
      // Validate all locations
      for (const location of locations || []) {
        const result = await validateLocationRevenue(
          supabase,
          { id: location.id, name: locationNames[location.id] || 'Unknown' },
          referenceData.get(location.id) || new Map(),
          startDate,
          endDate
        );
        results.push(result);
      }
    }
    
    console.log('[API /bork/validate-revenue] Revenue validation completed:', results.length, 'locations');
    
    // Calculate overall summary
    const totalLocations = results.length;
    const totalDates = results.reduce((sum, r) => sum + r.totalDates, 0);
    const totalExactMatches = results.reduce((sum, r) => sum + r.exactMatches, 0);
    const totalMinorMismatches = results.reduce((sum, r) => sum + r.minorMismatches, 0);
    const totalMajorMismatches = results.reduce((sum, r) => sum + r.majorMismatches, 0);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalLocations,
        totalDates,
        totalExactMatches,
        totalMinorMismatches,
        totalMajorMismatches
      }
    });
    
  } catch (error) {
    console.error('[API /bork/validate-revenue] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * Validate revenue for a single location
 */
async function validateLocationRevenue(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  location: { id: string; name: string },
  referenceRevenueData: Map<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  startDate?: string | null,
  endDate?: string | null
): Promise<RevenueValidationResult> {
  console.log(`[API /bork/validate-revenue] Validating revenue for location: ${location.name}`);
  
  let query = supabase
    .from('bork_sales_data')
    .select('date, quantity')
    .eq('location_id', location.id);
  
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  // Get actual revenue from database
  const { data: dbData, error: dbError } = await query;
  
  if (dbError) {
    console.error(`[API /bork/validate-revenue] Database error for ${location.name}:`, dbError);
    return {
      locationId: location.id,
      locationName: location.name,
      matchedField: 'incl_vat',
      mismatches: [],
      totalDates: 0,
      exactMatches: 0,
      minorMismatches: 0,
      majorMismatches: 0
    };
  }
  
  // Aggregate database revenue by date
  const dbRevenueByDate = new Map<string, number>();
  dbData?.forEach((row: { date: string; quantity: number }) => {
    const current = dbRevenueByDate.get(row.date) || 0;
    dbRevenueByDate.set(row.date, current + row.quantity);
  });
  
  // Filter reference data by date range if provided
  let filteredReferenceData = referenceRevenueData;
  if (startDate || endDate) {
    filteredReferenceData = new Map();
    referenceRevenueData.forEach((revenueData, date) => {
      let include = true;
      if (startDate && date < startDate) include = false;
      if (endDate && date > endDate) include = false;
      if (include) {
        filteredReferenceData.set(date, revenueData);
      }
    });
  }
  
  const mismatches: RevenueMismatch[] = [];
  let exactMatches = 0;
  let minorMismatches = 0;
  let majorMismatches = 0;
  let matchedField: 'incl_vat' | 'excl_vat' = 'incl_vat';
  
  // Try matching with incl VAT first
  let bestMatchField: 'incl_vat' | 'excl_vat' = 'incl_vat';
  
  // Test incl VAT matching
  let inclVATMatches = 0;
  filteredReferenceData.forEach((revenueData, date) => {
    const dbRevenue = dbRevenueByDate.get(date) || 0;
    const refRevenue = revenueData.revenueInclVAT || 0;
    
    if (refRevenue > 0 && dbRevenue > 0) {
      const percentageDiff = Math.abs(((dbRevenue - refRevenue) / refRevenue) * 100);
      if (percentageDiff <= 2.5) {
        inclVATMatches++;
      }
    }
  });
  
  // Test excl VAT matching
  let exclVATMatches = 0;
  filteredReferenceData.forEach((revenueData, date) => {
    const dbRevenue = dbRevenueByDate.get(date) || 0;
    const refRevenue = revenueData.revenueExclVAT || 0;
    
    if (refRevenue > 0 && dbRevenue > 0) {
      const percentageDiff = Math.abs(((dbRevenue - refRevenue) / refRevenue) * 100);
      if (percentageDiff <= 2.5) {
        exclVATMatches++;
      }
    }
  });
  
  // Choose the field with better matching
  if (exclVATMatches > inclVATMatches) {
    matchedField = 'excl_vat';
    bestMatchField = 'excl_vat';
  } else {
    matchedField = 'incl_vat';
    bestMatchField = 'incl_vat';
  }
  
  // Now calculate mismatches using the best matching field
  filteredReferenceData.forEach((revenueData, date) => {
    const dbRevenue = dbRevenueByDate.get(date) || 0;
    const refRevenue = bestMatchField === 'incl_vat' ? revenueData.revenueInclVAT : revenueData.revenueExclVAT;
    
    if (refRevenue > 0 && dbRevenue > 0) {
      const difference = dbRevenue - refRevenue;
      const percentageDiff = (difference / refRevenue) * 100;
      
      let severity: 'exact' | 'minor' | 'major' = 'exact';
      if (Math.abs(percentageDiff) > 2.5) {
        severity = 'major';
        majorMismatches++;
      } else if (Math.abs(percentageDiff) > 0) {
        severity = 'minor';
        minorMismatches++;
      } else {
        exactMatches++;
      }
      
      mismatches.push({
        date,
        referenceRevenue: refRevenue,
        databaseRevenue: dbRevenue,
        difference,
        percentageDiff,
        severity
      });
    }
  });
  
  console.log(`[API /bork/validate-revenue] ${location.name}: ${exactMatches} exact, ${minorMismatches} minor, ${majorMismatches} major mismatches`);
  
  return {
    locationId: location.id,
    locationName: location.name,
    matchedField,
    mismatches,
    totalDates: mismatches.length,
    exactMatches,
    minorMismatches,
    majorMismatches
  };
}
