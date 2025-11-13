import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * COGS Hierarchy API
 * Returns complete MAIN -> SUB -> SUB-SUB hierarchy from powerbi_pnl_data
 * with amounts and matching to accountant structure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location') || 'all';
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('powerbi_pnl_data')
      .select('category, subcategory, gl_account, amount, year, month, location_id')
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('gl_account', { ascending: true });

    if (locationId !== 'all') {
      query = query.eq('location_id', locationId);
    }

    if (year) {
      query = query.eq('year', parseInt(year));
    }

    if (month) {
      query = query.eq('month', parseInt(month));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Build hierarchy: MAIN -> SUB -> SUB-SUB
    interface HierarchyNode {
      main: string;
      subs: {
        sub: string;
        subSubs: {
          glAccount: string;
          amount: number;
          recordCount: number;
        }[];
        totalAmount: number;
        recordCount: number;
      }[];
      totalAmount: number;
      recordCount: number;
    }

    const hierarchyMap = new Map<string, Map<string, Map<string, { amount: number; count: number }>>>();

    // First pass: build the nested structure
    data?.forEach((record) => {
      const main = record.category || 'UNKNOWN';
      const sub = record.subcategory || 'NO_SUBCATEGORY';
      const subSub = record.gl_account || 'NO_GL_ACCOUNT';
      const amount = record.amount || 0;

      if (!hierarchyMap.has(main)) {
        hierarchyMap.set(main, new Map());
      }
      const subMap = hierarchyMap.get(main)!;

      if (!subMap.has(sub)) {
        subMap.set(sub, new Map());
      }
      const subSubMap = subMap.get(sub)!;

      if (!subSubMap.has(subSub)) {
        subSubMap.set(subSub, { amount: 0, count: 0 });
      }
      const subSubData = subSubMap.get(subSub)!;
      subSubData.amount += amount;
      subSubData.count += 1;
    });

    // Second pass: convert to array structure with totals
    const hierarchy: HierarchyNode[] = [];

    hierarchyMap.forEach((subMap, mainCategory) => {
      const subs: HierarchyNode['subs'] = [];
      let mainTotal = 0;
      let mainCount = 0;

      subMap.forEach((subSubMap, subCategory) => {
        const subSubs: HierarchyNode['subs'][0]['subSubs'] = [];
        let subTotal = 0;
        let subCount = 0;

        subSubMap.forEach((data, glAccount) => {
          subSubs.push({
            glAccount,
            amount: data.amount,
            recordCount: data.count
          });
          subTotal += data.amount;
          subCount += data.count;
        });

        subs.push({
          sub: subCategory,
          subSubs: subSubs.sort((a, b) => a.glAccount.localeCompare(b.glAccount)),
          totalAmount: subTotal,
          recordCount: subCount
        });

        mainTotal += subTotal;
        mainCount += subCount;
      });

      hierarchy.push({
        main: mainCategory,
        subs: subs.sort((a, b) => a.sub.localeCompare(b.sub)),
        totalAmount: mainTotal,
        recordCount: mainCount
      });
    });

    // Sort by main category name
    hierarchy.sort((a, b) => a.main.localeCompare(b.main));

    // Map to accountant structure
    const accountantMapping = {
      'Netto-omzet': [
        'Netto-omzet uit leveringen geproduceerde goederen',
        'Netto-omzet uit verkoop van handelsgoederen',
        'Netto-omzet groepen'
      ],
      'Kostprijs van de omzet': [
        'Inkoopwaarde handelsgoederen',
        'Kostprijs van de omzet'
      ],
      'Lasten uit hoofde van personeelsbeloningen': [
        'Lonen en salarissen',
        'Lasten uit hoofde van personeelsbeloningen',
        'Arbeidskosten'
      ],
      'Afschrijvingen op immateriële en materiële vaste activa': [
        'Afschrijvingen op immateriële en materiële vaste activa',
        'Afschrijvingen op immateriële vaste activa',
        'Afschrijvingen op materiële vaste activa',
        'Afschrijvingen'
      ],
      'Overige bedrijfskosten': [
        'Overige bedrijfskosten',
        'Huisvestingskosten',
        'Exploitatie- en machinekosten',
        'Verkoop gerelateerde kosten',
        'Autokosten',
        'Kantoorkosten',
        'Assurantiekosten',
        'Accountants- en advieskosten',
        'Administratieve lasten',
        'Andere kosten'
      ],
      'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten': [
        'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
      ],
      'Financiële baten en lasten': [
        'Financiële baten en lasten'
      ]
    };

    // Create mapping report
    const mappingReport = Object.entries(accountantMapping).map(([accountantCategory, expectedCategories]) => {
      const matchedMains = hierarchy.filter(h => 
        expectedCategories.some(cat => 
          h.main === cat || 
          h.subs.some(sub => sub.sub === cat) ||
          h.subs.some(sub => sub.subSubs.some(ss => ss.glAccount === cat))
        )
      );

      const totalAmount = matchedMains.reduce((sum, main) => sum + main.totalAmount, 0);
      const totalRecords = matchedMains.reduce((sum, main) => sum + main.recordCount, 0);

      return {
        accountantCategory,
        expectedCategories,
        matchedMainCategories: matchedMains.map(m => m.main),
        totalAmount,
        totalRecords,
        matchCount: matchedMains.length
      };
    });

    return NextResponse.json({
      success: true,
      totalRecords: data?.length || 0,
      hierarchy,
      mappingReport,
      summary: {
        totalMainCategories: hierarchy.length,
        totalSubCategories: hierarchy.reduce((sum, h) => sum + h.subs.length, 0),
        totalSubSubCategories: hierarchy.reduce((sum, h) => 
          sum + h.subs.reduce((s, sub) => s + sub.subSubs.length, 0), 0
        ),
        totalAmount: hierarchy.reduce((sum, h) => sum + h.totalAmount, 0)
      }
    });

  } catch (error) {
    console.error('[API /finance/pnl-balance/cogs-hierarchy] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}



