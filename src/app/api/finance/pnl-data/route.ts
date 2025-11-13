import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

interface MockPnLData {
  category: string;
  subcategory: string | null;
  gl_account: string;
  amount: number;
  month: number;
  location_id: string;
  year: number;
  import_id: string;
}

/**
 * Generate mock P&L data for testing when database is unavailable
 * NOTE: Currently not used - using live data only
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateMockPnLData(year: number, location: string) {
  const categories = [
    'Netto-omzet groepen',
    'Netto-omzet uit leveringen geproduceerde goederen',
    'Netto-omzet uit verkoop van handelsgoederen',
    'Kostprijs van de omzet',
    'Inkoopwaarde handelsgoederen',
    'Total Labor',
    'Labor - Contract',
    'Labor - Flex',
    'Labor - Other',
    'Lonen en salarissen',
    'Overige lasten uit hoofde van personeelsbeloningen',
    'Pensioenlasten',
    'Sociale lasten',
    'Werkkostenregeling - detail',
    'Overige personeelsgerelateerde kosten',
    'Overige bedrijfskosten',
    'Accountants- en advieskosten',
    'Administratieve lasten',
    'Andere kosten',
    'Assurantiekosten',
    'Autokosten',
    'Exploitatie- en machinekosten',
    'Huisvestingskosten',
    'Kantoorkosten',
    'Verkoop gerelateerde kosten',
    'Afschrijvingen op immateriële en materiële vaste activa',
    'Afschrijvingen op immateriële vaste activa',
    'Afschrijvingen op materiële vaste activa',
    'Financiële baten en lasten',
    'Rentebaten en soortgelijke opbrengsten',
    'Rentelasten en soortgelijke kosten',
    'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
  ];

  const mockData: MockPnLData[] = [];
  
  // Generate data for each month
  for (let month = 1; month <= 12; month++) {
    categories.forEach((category, index) => {
      // Generate realistic amounts based on category type
      let baseAmount = 0;
      if (category.includes('Netto-omzet')) {
        baseAmount = Math.random() * 50000 + 20000; // Revenue: 20k-70k
      } else if (category.includes('Kostprijs') || category.includes('Inkoopwaarde')) {
        baseAmount = Math.random() * 30000 + 10000; // Cost of sales: 10k-40k
      } else if (category.includes('Labor') || category.includes('Lonen')) {
        baseAmount = Math.random() * 25000 + 15000; // Labor: 15k-40k
      } else if (category.includes('Overige bedrijfskosten')) {
        baseAmount = Math.random() * 5000 + 2000; // Other costs: 2k-7k
      } else if (category.includes('Afschrijvingen')) {
        baseAmount = Math.random() * 3000 + 1000; // Depreciation: 1k-4k
      } else if (category.includes('Financiële')) {
        baseAmount = Math.random() * 2000 - 1000; // Financial: -1k to 1k
      } else {
        baseAmount = Math.random() * 1000 + 500; // Other: 500-1.5k
      }

      // Add some seasonal variation
      const seasonalMultiplier = month >= 6 && month <= 8 ? 1.2 : 0.9; // Summer boost
      const amount = Math.round(baseAmount * seasonalMultiplier);

      mockData.push({
        category,
        subcategory: null,
        gl_account: `GL${String(index + 1).padStart(3, '0')}`,
        amount,
        month,
        location_id: location === 'all' ? '550e8400-e29b-41d4-a716-446655440000' : location,
        year,
        import_id: 'mock-import-001'
      });
    });
  }

  return mockData;
}

/**
 * P&L DATA API
 * 
 * Fetches Profit & Loss data from powerbi_pnl_data table
 * with filtering by year and location
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-data] P&L data request received');
    
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '', 10);
    const location = searchParams.get('location') || 'all';

    // DEFENSIVE: Validate required parameters
    if (isNaN(year) || year < 2020 || year > 2030) {
      return NextResponse.json({
        success: false,
        error: 'Invalid year. Please provide a valid year between 2020-2030.'
      }, { status: 400 });
    }

    // Create Supabase client
    console.log('[API /finance/pnl-data] Creating Supabase client...');
    const supabase = await createClient();
    console.log('[API /finance/pnl-data] Supabase client created successfully');

    // Build query with proper filtering - directly query live data
    let query = supabase
      .from('powerbi_pnl_data')
      .select('category, subcategory, gl_account, amount, month, location_id, year, import_id')
      .eq('year', year)
      .order('gl_account', { ascending: true })
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('month', { ascending: true });

    // Apply location filter if not 'all'
    if (location !== 'all') {
      // Location is a UUID string, not an integer
      query = query.eq('location_id', location);
    }

    console.log('[API /finance/pnl-data] Executing paginated query...');
    
    // DEFENSIVE: Use pagination to fetch all data
    let allData: MockPnLData[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: pageData, error: pageError } = await query
        .range(from, from + pageSize - 1);
      
      if (pageError) {
        console.error('[API /finance/pnl-data] Page error:', pageError);
        return NextResponse.json({
          success: false,
          error: pageError.message
        }, { status: 500 });
      }

      if (pageData && pageData.length > 0) {
        allData = [...allData, ...pageData];
        from += pageSize;
        hasMore = pageData.length === pageSize;
        console.log(`[API /finance/pnl-data] Fetched page: ${pageData.length} records, total: ${allData.length}`);
      } else {
        hasMore = false;
      }
    }

    const data = allData;
    console.log('[API /finance/pnl-data] Paginated query completed. Total records:', data.length);

    console.log(`[API /finance/pnl-data] Successfully fetched ${data?.length || 0} P&L records for year ${year}, location ${location}`);

    // Return live data - if no data found, return empty array (not mock data)
    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        year,
        location,
        recordCount: data?.length || 0,
        isLiveData: true
      }
    });

  } catch (error) {
    console.error('[API /finance/pnl-data] Error fetching live data:', error);
    
    // Only return error, don't fall back to mock data - user wants live data
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch P&L data from database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
