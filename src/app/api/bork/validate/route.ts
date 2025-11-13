import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { parseAllLocationData } from '@/lib/bork/xlsx-parser';

export interface ValidationResult {
  locationId: string;
  locationName: string;
  expectedDates: string[];
  actualDates: string[];
  missingDates: string[];
  extraDates: string[];
  totalExpected: number;
  totalActual: number;
  completionPercentage: number;
  status: 'complete' | 'partial' | 'missing';
  monthlyBreakdown: {
    [month: string]: {
      expected: number;
      actual: number;
      missing: string[];
      completionPercentage: number;
    };
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API /bork/validate] Starting validation...');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log('[API /bork/validate] Parameters:', { locationId, startDate, endDate });
    
    // Parse reference data from XLSX files
    console.log('[API /bork/validate] Parsing XLSX reference data...');
    const referenceData = await parseAllLocationData();
    
    // Get locations from existing API
    const locationsResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/locations`);
    const locationsResult = await locationsResponse.json();
    
    if (!locationsResult.success || !locationsResult.data) {
      console.error('[API /bork/validate] Error fetching locations:', locationsResult.error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch locations' 
      }, { status: 500 });
    }
    
    const locations = locationsResult.data;
    
    const results: ValidationResult[] = [];
    
    // Location name mapping
    const locationNames: Record<string, string> = {
      '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
      '550e8400-e29b-41d4-a716-446655440003': 'Van Kinsbergen',
      '550e8400-e29b-41d4-a716-446655440001': "L'Amour Toujours"
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
      
      const revenueData = referenceData.get(locationId) || new Map();
      const expectedDates = new Set(revenueData.keys());
      const result = await validateLocation(
        supabase, 
        { id: location.id, name: locationNames[location.id] || 'Unknown' }, 
        expectedDates,
        startDate,
        endDate
      );
      results.push(result);
    } else {
      // Validate all locations
      for (const location of locations || []) {
        const revenueData = referenceData.get(location.id) || new Map();
        const expectedDates = new Set(revenueData.keys());
        const result = await validateLocation(
          supabase,
          { id: location.id, name: locationNames[location.id] || 'Unknown' },
          expectedDates,
          startDate,
          endDate
        );
        results.push(result);
      }
    }
    
    console.log('[API /bork/validate] Validation completed:', results.length, 'locations');
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalLocations: results.length,
        completeLocations: results.filter(r => r.status === 'complete').length,
        partialLocations: results.filter(r => r.status === 'partial').length,
        missingLocations: results.filter(r => r.status === 'missing').length
      }
    });
    
  } catch (error) {
    console.error('[API /bork/validate] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Validate a single location
 */
async function validateLocation(
  supabase: any, // eslint-disable-line @typescript-eslint/no-explicit-any
  location: { id: string; name: string },
  expectedDates: Set<string>,
  startDate?: string | null,
  endDate?: string | null
): Promise<ValidationResult> {
  console.log(`[API /bork/validate] Validating location: ${location.name}`);
  
  // Build database query
  let query = supabase
    .from('bork_sales_data')
    .select('date')
    .eq('location_id', location.id);
  
  // Apply date filters if provided
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }
  
  // Get actual dates from database
  const { data: dbData, error: dbError } = await query;
  
  if (dbError) {
    console.error(`[API /bork/validate] Database error for ${location.name}:`, dbError);
    return {
      locationId: location.id,
      locationName: location.name,
      expectedDates: [],
      actualDates: [],
      missingDates: [],
      extraDates: [],
      totalExpected: 0,
      totalActual: 0,
      completionPercentage: 0,
      status: 'missing',
      monthlyBreakdown: {}
    };
  }
  
  // Convert to sets for comparison
  const actualDates = new Set(dbData?.map((row: { date: string }) => row.date) || []);
  
  // Filter expected dates by date range if provided
  let filteredExpectedDates = expectedDates;
  if (startDate || endDate) {
    filteredExpectedDates = new Set(
      Array.from(expectedDates).filter(date => {
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      })
    );
  }
  
  // Find missing and extra dates
  const missingDates = Array.from(filteredExpectedDates).filter(date => !actualDates.has(date as string));
  const extraDates = Array.from(actualDates).filter(date => !filteredExpectedDates.has(date as string));
  
  // Calculate completion percentage
  const totalExpected = filteredExpectedDates.size;
  const totalActual = actualDates.size;
  const completionPercentage = totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
  
  // Determine status
  let status: 'complete' | 'partial' | 'missing';
  if (completionPercentage >= 100) {
    status = 'complete';
  } else if (completionPercentage >= 50) {
    status = 'partial';
  } else {
    status = 'missing';
  }

  // Calculate monthly breakdown
  const monthlyBreakdown: { [month: string]: { expected: number; actual: number; missing: string[]; completionPercentage: number } } = {};
  
  // Group dates by month (YYYY-MM format)
  const monthlyData: { [month: string]: { expected: string[]; actual: string[] } } = {};
  
  // Group expected dates by month
  Array.from(filteredExpectedDates).forEach((date: string) => {
    const month = date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { expected: [], actual: [] };
    }
    monthlyData[month].expected.push(date);
  });
  
  // Group actual dates by month
  Array.from(actualDates).forEach((date) => {
    const month = (date as string).substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { expected: [], actual: [] };
    }
    monthlyData[month].actual.push(date as string);
  });
  
  // Calculate monthly breakdown
  Object.keys(monthlyData).sort().forEach(month => {
    const data = monthlyData[month];
    const expected = data.expected.length;
    const actual = data.actual.length;
    const missing = data.expected.filter(date => !data.actual.includes(date));
    const monthCompletionPercentage = expected > 0 ? Math.round((actual / expected) * 100) : 0;
    
    monthlyBreakdown[month] = {
      expected,
      actual,
      missing,
      completionPercentage: monthCompletionPercentage
    };
  });
  
  console.log(`[API /bork/validate] ${location.name}: ${completionPercentage}% complete (${totalActual}/${totalExpected})`);
  
  return {
    locationId: location.id,
    locationName: location.name,
    expectedDates: Array.from(filteredExpectedDates).sort() as string[],
    actualDates: Array.from(actualDates).sort() as string[],
    missingDates: missingDates.sort() as string[],
    extraDates: extraDates.sort() as string[],
    totalExpected,
    totalActual,
    completionPercentage,
    status,
    monthlyBreakdown
  };
}
