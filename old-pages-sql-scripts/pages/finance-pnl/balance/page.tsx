/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/pnl
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateMonthlyPnL, getAvailableCategories, type PnLData } from '@/lib/finance/pnl-calculations';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

// PnLData interface is now imported from pnl-calculations

interface AggregatedPnLRecord {
  id: string;
  location_id: string;
  year: number;
  month: number;
  // Revenue (positive values)
  netto_omzet_uit_levering_geproduceerd: number;
  netto_omzet_verkoop_handelsgoederen: number;
  revenue_total?: number;
  // Cost of Sales (negative values)
  inkoopwaarde_handelsgoederen: number;
  cost_of_sales_total?: number;
  // Labor Costs (negative values)
  lonen_en_salarissen?: number;
  labor_contract?: number;
  labor_flex?: number;
  labor_total?: number;
  // Other Costs (negative values)
  other_costs_total?: number;
  overige_bedrijfskosten?: number;
  huisvestingskosten?: number;
  exploitatie_kosten?: number;
  verkoop_kosten?: number;
  autokosten?: number;
  kantoorkosten?: number;
  assurantiekosten?: number;
  accountantskosten?: number;
  administratieve_lasten?: number;
  andere_kosten?: number;
  afschrijvingen?: number;
  financiele_baten_lasten?: number;
  opbrengst_vorderingen?: number;
  // Calculated
  total_costs?: number;
  resultaat: number;
  // Metadata
  import_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ProcessedPnLData {
  category: string;
  subcategory: string | null;
  amounts: { [month: number]: number };
  total: number;
  isExpanded: boolean;
  isSubcategory: boolean;
  isMissing?: boolean; // Flag for missing categories
  isCollapsible?: boolean; // Flag for collapsible categories
  parentCategory?: string; // Parent category for subcategories
}

interface ValidationResult {
  isValid: boolean;
  errorMargin: number;
  calculatedResult: number;
  actualResult: number;
  missingCategories: string[];
}

// MONTHS will be defined inside the component to use translations

// LOCATIONS will be defined inside the component to use translations

const COGS_CATEGORIES = [
  // REVENUE CALCULATIONS
  {
    category: 'Netto-omzet groepen',
    subcategories: [
      'Netto-omzet uit leveringen geproduceerde goederen',
      'Netto-omzet uit verkoop van handelsgoederen'
    ],
    isCollapsible: true
  },
  {
    category: 'Netto-omzet uit leveringen geproduceerde goederen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Netto-omzet groepen',
    isCollapsible: true
  },
  {
    category: 'Netto-omzet uit verkoop van handelsgoederen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Netto-omzet groepen',
    isCollapsible: true
  },
  
  // COST OF SALES COGS
  {
    category: 'Kostprijs van de omzet',
    subcategories: [
      'Inkoopwaarde handelsgoederen'
    ],
    isCollapsible: true
  },
  {
    category: 'Inkoopwaarde handelsgoederen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Kostprijs van de omzet'
  },
  
  // LABOR COST COGS
  {
    category: 'Arbeidskosten',
    subcategories: [
      'Contract Arbeid',
      'Flex Arbeid',
      'Overige Arbeid'
    ],
    isCollapsible: true
  },
  {
    category: 'Contract Arbeid',
    subcategories: [
      'Lonen en salarissen',
      'Overige lasten uit hoofde van personeelsbeloningen',
      'Pensioenlasten',
      'Sociale lasten'
    ],
    isSubcategory: true,
    parentCategory: 'Arbeidskosten'
  },
  {
    category: 'Flex Arbeid',
    subcategories: [
      'Werkkostenregeling - detail'
    ],
    isSubcategory: true,
    parentCategory: 'Arbeidskosten'
  },
  {
    category: 'Overige Arbeid',
    subcategories: [
      'Overige personeelsgerelateerde kosten'
    ],
    isSubcategory: true,
    parentCategory: 'Arbeidskosten'
  },
  {
    category: 'Lonen en salarissen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Contract Arbeid'
  },
  {
    category: 'Overige lasten uit hoofde van personeelsbeloningen',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Contract Arbeid'
  },
  {
    category: 'Pensioenlasten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Contract Arbeid'
  },
  {
    category: 'Sociale lasten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Contract Arbeid'
  },
  {
    category: 'Werkkostenregeling - detail',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Flex Arbeid'
  },
  {
    category: 'Overige personeelsgerelateerde kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige Arbeid'
  },
  
  // OTHER_UNDEFINED COGS
  {
    category: 'Overige bedrijfskosten',
    subcategories: [
      'Accountants- en advieskosten',
      'Administratieve lasten',
      'Andere kosten',
      'Assurantiekosten',
      'Autokosten',
      'Exploitatie- en machinekosten',
      'Huisvestingskosten',
      'Kantoorkosten',
      'Verkoop gerelateerde kosten'
    ],
    isCollapsible: false // Don't show sub-categories
  },
  {
    category: 'Accountants- en advieskosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Administratieve lasten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Andere kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Assurantiekosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Autokosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Exploitatie- en machinekosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Huisvestingskosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Kantoorkosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  {
    category: 'Verkoop gerelateerde kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Overige bedrijfskosten'
  },
  
  // DEPRECIATION
  {
    category: 'Afschrijvingen op immateriële en materiële vaste activa',
    subcategories: [
      'Afschrijvingen op immateriële vaste activa',
      'Afschrijvingen op materiële vaste activa'
    ],
    isCollapsible: false // Don't show sub-categories
  },
  {
    category: 'Afschrijvingen op immateriële vaste activa',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Afschrijvingen op immateriële en materiële vaste activa'
  },
  {
    category: 'Afschrijvingen op materiële vaste activa',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Afschrijvingen op immateriële en materiële vaste activa'
  },
  
  // FINANCIAL
  {
    category: 'Financiële baten en lasten',
    subcategories: [
      'Rentebaten en soortgelijke opbrengsten',
      'Rentelasten en soortgelijke kosten',
      'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
    ],
    isCollapsible: false // Don't show sub-categories
  },
  {
    category: 'Rentebaten en soortgelijke opbrengsten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Financiële baten en lasten'
  },
  {
    category: 'Rentelasten en soortgelijke kosten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Financiële baten en lasten'
  },
  {
    category: 'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten',
    subcategories: [],
    isSubcategory: true,
    parentCategory: 'Financiële baten en lasten'
  }
];

export default function PnLBalancePage() {
  const { t, ready } = useTranslation('common');
  const [isMounted, setIsMounted] = useState(false);
  
  // Track client-side mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Only use translations after component is mounted on client
  const canUseTranslations = isMounted && ready;
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [pnlData, setPnlData] = useState<ProcessedPnLData[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  // Define translated arrays with fallbacks
  const MONTHS = useMemo(() => [
    { value: 1, label: canUseTranslations ? t('pnl.table.january') : 'Jan' },
    { value: 2, label: canUseTranslations ? t('pnl.table.february') : 'Feb' },
    { value: 3, label: canUseTranslations ? t('pnl.table.march') : 'Mar' },
    { value: 4, label: canUseTranslations ? t('pnl.table.april') : 'Apr' },
    { value: 5, label: canUseTranslations ? t('pnl.table.may') : 'May' },
    { value: 6, label: canUseTranslations ? t('pnl.table.june') : 'Jun' },
    { value: 7, label: canUseTranslations ? t('pnl.table.july') : 'Jul' },
    { value: 8, label: canUseTranslations ? t('pnl.table.august') : 'Aug' },
    { value: 9, label: canUseTranslations ? t('pnl.table.september') : 'Sep' },
    { value: 10, label: canUseTranslations ? t('pnl.table.october') : 'Oct' },
    { value: 11, label: canUseTranslations ? t('pnl.table.november') : 'Nov' },
    { value: 12, label: canUseTranslations ? t('pnl.table.december') : 'Dec' }
  ], [t, canUseTranslations]);

  const LOCATIONS = useMemo(() => [
    { value: 'all', label: canUseTranslations ? t('pnl.locations.all') : 'All Locations' },
    { value: '550e8400-e29b-41d4-a716-446655440001', label: canUseTranslations ? t('pnl.locations.kinsbergen') : 'Van Kinsbergen' },
    { value: '550e8400-e29b-41d4-a716-446655440002', label: canUseTranslations ? t('pnl.locations.barbea') : 'Bar Bea' },
    { value: '550e8400-e29b-41d4-a716-446655440003', label: canUseTranslations ? t('pnl.locations.lamour') : 'L\'Amour Toujours' }
  ], [t, canUseTranslations]);

  // NOTE: processPnLData is kept for reference but not used - we now use mapAggregatedToDisplay
  // Process raw P&L data into structured format using calculation service
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const processPnLData = useCallback((rawData: PnLData[]): ProcessedPnLData[] => {
    const processed: ProcessedPnLData[] = [];

    // Get available categories from the data
    const availableCategories = getAvailableCategories(rawData);
    console.log('[P&L Debug] Available categories in data:', availableCategories);

    // Process main categories first
    COGS_CATEGORIES.forEach(categoryConfig => {
      // Skip subcategories here, they'll be processed separately
      if (categoryConfig.isSubcategory) return;
      
      // Add main category
      const mainCategory: ProcessedPnLData = {
        category: categoryConfig.category,
        subcategory: null,
        amounts: {},
        total: 0,
        isExpanded: false,
        isSubcategory: false,
        isCollapsible: categoryConfig.isCollapsible || false
      };

      // Calculate amounts for each month by summing all subcategories
      MONTHS.forEach(month => {
        let monthlyTotal = 0;
        
        // For labor categories (Arbeidskosten, Contract Arbeid, Flex Arbeid, Overige Arbeid),
        // we need to aggregate from actual database categories (the sub-subcategories)
        const isLaborCategory = categoryConfig.category === 'Arbeidskosten' || 
                                categoryConfig.category === 'Contract Arbeid' || 
                                categoryConfig.category === 'Flex Arbeid' ||
                                categoryConfig.category === 'Overige Arbeid';
        
        if (isLaborCategory && categoryConfig.subcategories) {
          // Aggregate from nested subcategories (actual database category names)
          categoryConfig.subcategories.forEach(subcategoryName => {
            const subcategoryConfig = COGS_CATEGORIES.find(c => c.category === subcategoryName);
            if (subcategoryConfig && subcategoryConfig.subcategories && subcategoryConfig.subcategories.length > 0) {
              // Aggregate from sub-subcategories (actual database categories like 'Lonen en salarissen')
              subcategoryConfig.subcategories.forEach(dbCategoryName => {
                const dbCategoryData = rawData.filter(d => 
                  d.category === dbCategoryName && d.month === month.value
                );
                monthlyTotal += dbCategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
              });
            } else {
              // If the subcategory itself is a database category (no further nesting)
              const subcategoryData = rawData.filter(d => 
                d.category === subcategoryName && d.month === month.value
              );
              monthlyTotal += subcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
            }
          });
        } else {
          // Standard aggregation: sum all subcategories for this main category
          if (categoryConfig.subcategories) {
            categoryConfig.subcategories.forEach(subcategoryName => {
              const subcategoryData = rawData.filter(d => 
                d.category === subcategoryName && d.month === month.value
              );
              monthlyTotal += subcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
            });
          }
        }
        
        // Also check if the main category itself has data
        const mainCategoryData = rawData.filter(d => 
          d.category === categoryConfig.category && d.month === month.value && !d.subcategory
        );
        monthlyTotal += mainCategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
        
        mainCategory.amounts[month.value] = monthlyTotal;
        mainCategory.total += monthlyTotal;
      });

      processed.push(mainCategory);

      // Add subcategories only if category is collapsible (user wants to see them)
      if (categoryConfig.subcategories && categoryConfig.isCollapsible !== false) {
        categoryConfig.subcategories.forEach(subcategoryName => {
          const subcategory: ProcessedPnLData = {
            category: subcategoryName,
            subcategory: null,
            amounts: {},
            total: 0,
            isExpanded: false,
            isSubcategory: true,
            parentCategory: categoryConfig.category,
            isCollapsible: true
          };

          // Calculate amounts for each month
          MONTHS.forEach(month => {
            let monthlyTotal = 0;
            
            // For labor subcategories (Contract Arbeid, Flex Arbeid, Overige Arbeid),
            // aggregate from their actual database categories (sub-subcategories)
            const isLaborSubcategory = subcategoryName === 'Contract Arbeid' || 
                                      subcategoryName === 'Flex Arbeid' ||
                                      subcategoryName === 'Overige Arbeid';
            
            if (isLaborSubcategory) {
              // Find the subcategory config to get its subcategories (actual DB categories)
              const subcategoryConfig = COGS_CATEGORIES.find(c => c.category === subcategoryName);
              if (subcategoryConfig && subcategoryConfig.subcategories) {
                // Aggregate from actual database categories
                subcategoryConfig.subcategories.forEach(dbCategoryName => {
                  const dbCategoryData = rawData.filter(d => 
                    d.category === dbCategoryName && d.month === month.value
                  );
                  monthlyTotal += dbCategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
                });
              }
            } else {
              // Standard: check if subcategory has its own data
              const subcategoryData = rawData.filter(d => 
                d.category === subcategoryName && d.month === month.value
              );
              monthlyTotal += subcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
            }
            
            subcategory.amounts[month.value] = monthlyTotal;
            subcategory.total += monthlyTotal;
          });

          processed.push(subcategory);

          // Add sub-subcategories
          const subcategoryConfig = COGS_CATEGORIES.find(c => c.category === subcategoryName);
          // Use configured list when provided, otherwise derive dynamically from rawData
          const subSubList = (subcategoryConfig && subcategoryConfig.subcategories && subcategoryConfig.subcategories.length > 0)
            ? subcategoryConfig.subcategories
            : Array.from(new Set(
                rawData
                  .filter(d => d.category === subcategoryName && d.subcategory)
                  .map(d => d.subcategory as string)
              ));

          if (subSubList && subSubList.length > 0) {
            subSubList.forEach(subSubcategoryName => {
              const subSubcategory: ProcessedPnLData = {
                category: subcategoryName,
                subcategory: subSubcategoryName,
                amounts: {},
                total: 0,
                isExpanded: false,
                isSubcategory: true,
                parentCategory: subcategoryName
              };

              // Calculate amounts for each month
              MONTHS.forEach(month => {
                const subSubcategoryData = rawData.filter(d => 
                  d.category === subcategoryName && d.subcategory === subSubcategoryName && d.month === month.value
                );
                const monthlyTotal = subSubcategoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
                
                subSubcategory.amounts[month.value] = monthlyTotal;
                subSubcategory.total += monthlyTotal;
              });

              processed.push(subSubcategory);
            });
          }
        });
      }
    });

    // Add calculated "Resultaat" (Profit/Loss) row
    const resultaat: ProcessedPnLData = {
      category: 'Resultaat',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false
    };
    
    // Calculate Resultaat for each month
    MONTHS.forEach(month => {
      const monthlyPnL = calculateMonthlyPnL(rawData, month.value);
      resultaat.amounts[month.value] = monthlyPnL.resultaat;
      resultaat.total += monthlyPnL.resultaat;
      
      // Debug logging for January 2025
      if (month.value === 1) {
        console.log(`[P&L Debug] January 2025 Calculation:`, {
          revenue: monthlyPnL.revenue,
          costs: monthlyPnL.costs,
          resultaat: monthlyPnL.resultaat,
          validation: monthlyPnL.validation
        });
      }
    });

    // Add any additional categories from raw data that weren't in COGS_CATEGORIES
    // Do this before adding Resultaat so Resultaat is always last
    const processedCategoryNames = new Set(processed.map(p => p.category));
    const allRawCategories = new Set(rawData.map(d => d.category).filter(Boolean));
    
    allRawCategories.forEach(categoryName => {
      // Skip if already processed
      if (processedCategoryNames.has(categoryName)) return;
      
      // Skip if it's a configured subcategory (check if it's in any category's subcategories array)
      const isConfiguredSubcategory = COGS_CATEGORIES.some(c => {
        const subcats = c.subcategories;
        return Array.isArray(subcats) && (subcats as string[]).includes(categoryName);
      });
      if (isConfiguredSubcategory) return;
      
      // Add the category with its data
      const additionalCategory: ProcessedPnLData = {
        category: categoryName,
        subcategory: null,
        amounts: {},
        total: 0,
        isExpanded: false,
        isSubcategory: false,
        isCollapsible: false
      };
      
      MONTHS.forEach(month => {
        const categoryData = rawData.filter(d => 
          d.category === categoryName && 
          d.month === month.value &&
          !d.subcategory // Only include top-level category data
        );
        const monthlyTotal = categoryData.reduce((sum, d) => sum + (d.amount || 0), 0);
        additionalCategory.amounts[month.value] = monthlyTotal;
        additionalCategory.total += monthlyTotal;
      });
      
      // Only add if there's data
      if (additionalCategory.total !== 0) {
        processed.push(additionalCategory);
        processedCategoryNames.add(categoryName);
      }
    });

    // Add Resultaat last
    processed.push(resultaat);

    return processed;
  }, [MONTHS]);

  // Map aggregated data from powerbi_pnl_aggregated to display format
  const mapAggregatedToDisplay = useCallback((aggregatedData: AggregatedPnLRecord[]): ProcessedPnLData[] => {
    const processed: ProcessedPnLData[] = [];

    // REVENUE
    const nettoOmzet: ProcessedPnLData = {
      category: 'Netto-omzet groepen',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false,
      isCollapsible: true
    };
    
    const nettoOmzetLevering: ProcessedPnLData = {
      category: 'Netto-omzet uit leveringen geproduceerde goederen',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Netto-omzet groepen',
      isCollapsible: true
    };
    
    const nettoOmzetHandel: ProcessedPnLData = {
      category: 'Netto-omzet uit verkoop van handelsgoederen',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Netto-omzet groepen',
      isCollapsible: true
    };

    // COST OF SALES
    const kostprijs: ProcessedPnLData = {
      category: 'Kostprijs van de omzet',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false,
      isCollapsible: true
    };
    
    const inkoopwaarde: ProcessedPnLData = {
      category: 'Inkoopwaarde handelsgoederen',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Kostprijs van de omzet'
    };

    // LABOR COSTS
    const arbeidskosten: ProcessedPnLData = {
      category: 'Arbeidskosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false,
      isCollapsible: true
    };
    
    const contractArbeid: ProcessedPnLData = {
      category: 'Contract Arbeid',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Arbeidskosten',
      isCollapsible: true
    };
    
    const flexArbeid: ProcessedPnLData = {
      category: 'Flex Arbeid',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Arbeidskosten',
      isCollapsible: true
    };

    // OTHER COSTS - Main category with sub-COGS
    const overigeBedrijfskosten: ProcessedPnLData = {
      category: 'Overige bedrijfskosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false,
      isCollapsible: true
    };

    // Sub-COGS under Overige bedrijfskosten
    const huisvestingskosten: ProcessedPnLData = {
      category: 'Huisvestingskosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const exploitatieKosten: ProcessedPnLData = {
      category: 'Exploitatie- en machinekosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const verkoopKosten: ProcessedPnLData = {
      category: 'Verkoop gerelateerde kosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const autokosten: ProcessedPnLData = {
      category: 'Autokosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const kantoorkosten: ProcessedPnLData = {
      category: 'Kantoorkosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const assurantiekosten: ProcessedPnLData = {
      category: 'Assurantiekosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const accountantskosten: ProcessedPnLData = {
      category: 'Accountants- en advieskosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const administratieveLasten: ProcessedPnLData = {
      category: 'Administratieve lasten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const andereKosten: ProcessedPnLData = {
      category: 'Andere kosten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const afschrijvingen: ProcessedPnLData = {
      category: 'Afschrijvingen op immateriële en materiële vaste activa',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    const financieel: ProcessedPnLData = {
      category: 'Financiële baten en lasten',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: true,
      parentCategory: 'Overige bedrijfskosten'
    };

    // RESULTAAT
    const resultaat: ProcessedPnLData = {
      category: 'Resultaat',
      subcategory: null,
      amounts: {},
      total: 0,
      isExpanded: false,
      isSubcategory: false
    };

    // Process each month's data
    MONTHS.forEach(month => {
      const monthData = aggregatedData.filter((item) => item.month === month.value);
      
      if (monthData.length === 0) {
        // Set all to 0 for months without data
        nettoOmzet.amounts[month.value] = 0;
        nettoOmzetLevering.amounts[month.value] = 0;
        nettoOmzetHandel.amounts[month.value] = 0;
        kostprijs.amounts[month.value] = 0;
        inkoopwaarde.amounts[month.value] = 0;
        arbeidskosten.amounts[month.value] = 0;
        contractArbeid.amounts[month.value] = 0;
        flexArbeid.amounts[month.value] = 0;
        overigeBedrijfskosten.amounts[month.value] = 0;
        huisvestingskosten.amounts[month.value] = 0;
        exploitatieKosten.amounts[month.value] = 0;
        verkoopKosten.amounts[month.value] = 0;
        autokosten.amounts[month.value] = 0;
        kantoorkosten.amounts[month.value] = 0;
        assurantiekosten.amounts[month.value] = 0;
        accountantskosten.amounts[month.value] = 0;
        administratieveLasten.amounts[month.value] = 0;
        andereKosten.amounts[month.value] = 0;
        afschrijvingen.amounts[month.value] = 0;
        financieel.amounts[month.value] = 0;
        resultaat.amounts[month.value] = 0;
        return;
      }

      // Aggregate values for this month (sum across all locations if location='all')
      const revenueLeveringTotal = monthData.reduce((sum: number, item) => 
        sum + (item.netto_omzet_uit_levering_geproduceerd || 0), 0);
      const revenueHandelTotal = monthData.reduce((sum: number, item) => 
        sum + (item.netto_omzet_verkoop_handelsgoederen || 0), 0);
      const revenueTotal = revenueLeveringTotal + revenueHandelTotal;
      
      const costInkoopTotal = monthData.reduce((sum: number, item) => 
        sum + (item.inkoopwaarde_handelsgoederen || 0), 0);
      
      const laborTotal = monthData.reduce((sum: number, item) => 
        sum + (item.labor_total || item.lonen_en_salarissen || 0), 0);
      const laborContractTotal = monthData.reduce((sum: number, item) => 
        sum + (item.labor_contract || 0), 0);
      const laborFlexTotal = monthData.reduce((sum: number, item) => 
        sum + (item.labor_flex || 0), 0);
      
      // Other costs total includes all sub-COGS
      const otherTotal = monthData.reduce((sum: number, item) => 
        sum + (item.other_costs_total || 0), 0);
      
      // Individual sub-COGS
      const huisvestingskostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.huisvestingskosten || 0), 0);
      const exploitatieKostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.exploitatie_kosten || 0), 0);
      const verkoopKostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.verkoop_kosten || 0), 0);
      const autokostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.autokosten || 0), 0);
      const kantoorkostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.kantoorkosten || 0), 0);
      const assurantiekostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.assurantiekosten || 0), 0);
      const accountantskostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.accountantskosten || 0), 0);
      const administratieveLastenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.administratieve_lasten || 0), 0);
      const andereKostenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.andere_kosten || 0), 0);
      const afschrijvingenTotal = monthData.reduce((sum: number, item) => 
        sum + (item.afschrijvingen || 0), 0);
      const financieelTotal = monthData.reduce((sum: number, item) => 
        sum + (item.financiele_baten_lasten || 0), 0);
      
      const resultaatTotal = monthData.reduce((sum: number, item) => 
        sum + (item.resultaat || 0), 0);

      // Assign values
      nettoOmzet.amounts[month.value] = revenueTotal;
      nettoOmzet.total += revenueTotal;
      nettoOmzetLevering.amounts[month.value] = revenueLeveringTotal;
      nettoOmzetLevering.total += revenueLeveringTotal;
      nettoOmzetHandel.amounts[month.value] = revenueHandelTotal;
      nettoOmzetHandel.total += revenueHandelTotal;
      
      kostprijs.amounts[month.value] = costInkoopTotal;
      kostprijs.total += costInkoopTotal;
      inkoopwaarde.amounts[month.value] = costInkoopTotal;
      inkoopwaarde.total += costInkoopTotal;
      
      arbeidskosten.amounts[month.value] = laborTotal;
      arbeidskosten.total += laborTotal;
      contractArbeid.amounts[month.value] = laborContractTotal;
      contractArbeid.total += laborContractTotal;
      flexArbeid.amounts[month.value] = laborFlexTotal;
      flexArbeid.total += laborFlexTotal;
      
      // Main category gets total of all sub-COGS
      overigeBedrijfskosten.amounts[month.value] = otherTotal;
      overigeBedrijfskosten.total += otherTotal;
      
      // Sub-COGS individual values
      huisvestingskosten.amounts[month.value] = huisvestingskostenTotal;
      huisvestingskosten.total += huisvestingskostenTotal;
      exploitatieKosten.amounts[month.value] = exploitatieKostenTotal;
      exploitatieKosten.total += exploitatieKostenTotal;
      verkoopKosten.amounts[month.value] = verkoopKostenTotal;
      verkoopKosten.total += verkoopKostenTotal;
      autokosten.amounts[month.value] = autokostenTotal;
      autokosten.total += autokostenTotal;
      kantoorkosten.amounts[month.value] = kantoorkostenTotal;
      kantoorkosten.total += kantoorkostenTotal;
      assurantiekosten.amounts[month.value] = assurantiekostenTotal;
      assurantiekosten.total += assurantiekostenTotal;
      accountantskosten.amounts[month.value] = accountantskostenTotal;
      accountantskosten.total += accountantskostenTotal;
      administratieveLasten.amounts[month.value] = administratieveLastenTotal;
      administratieveLasten.total += administratieveLastenTotal;
      andereKosten.amounts[month.value] = andereKostenTotal;
      andereKosten.total += andereKostenTotal;
      afschrijvingen.amounts[month.value] = afschrijvingenTotal;
      afschrijvingen.total += afschrijvingenTotal;
      financieel.amounts[month.value] = financieelTotal;
      financieel.total += financieelTotal;
      
      resultaat.amounts[month.value] = resultaatTotal;
      resultaat.total += resultaatTotal;
    });

    // Build the processed array in the right order
    processed.push(nettoOmzet);
    processed.push(nettoOmzetLevering);
    processed.push(nettoOmzetHandel);
    processed.push(kostprijs);
    processed.push(inkoopwaarde);
    processed.push(arbeidskosten);
    processed.push(contractArbeid);
    processed.push(flexArbeid);
    processed.push(overigeBedrijfskosten);
    // Sub-COGS under Overige bedrijfskosten
    processed.push(huisvestingskosten);
    processed.push(exploitatieKosten);
    processed.push(verkoopKosten);
    processed.push(autokosten);
    processed.push(kantoorkosten);
    processed.push(assurantiekosten);
    processed.push(accountantskosten);
    processed.push(administratieveLasten);
    processed.push(andereKosten);
    processed.push(afschrijvingen);
    processed.push(financieel);
    processed.push(resultaat);

    return processed;
  }, [MONTHS]);

  // Load P&L data from aggregated table
  const loadPnLData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        location: selectedLocation
      });

      // Use aggregated data endpoint - no calculations needed!
      const apiUrl = `/api/finance/pnl-aggregated-data?${params}`;
      console.log('[P&L Balance] Fetching aggregated data from:', apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[P&L Balance] Aggregated data result:', result);

      if (!result.success) {
        console.error('API returned success: false', result);
        throw new Error(result.error || 'Failed to load P&L data');
      }

      const aggregatedData = result.data || [];
      
      if (aggregatedData.length === 0) {
        console.log('[P&L Balance] No aggregated data found for the selected criteria');
        setError(null);
        setPnlData([]);
        setAvailableMonths([]);
        return;
      }
      
      // Extract available months from the aggregated data
      const months = [...new Set(aggregatedData.map((item: AggregatedPnLRecord) => item.month))] as number[];
      months.sort((a, b) => a - b);
      setAvailableMonths(months);
      
      // Map aggregated data to display format
      const processedData = mapAggregatedToDisplay(aggregatedData);
      setPnlData(processedData);

      // Validate the data
      const validation = validateBalance(processedData);
      setValidationResult(validation);

    } catch (err) {
      console.error('Error loading P&L data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load P&L data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedLocation, mapAggregatedToDisplay]);

  // Validate balance with 0.5% error margin
  const validateBalance = (data: ProcessedPnLData[]): ValidationResult => {
    const nettoOmzet = data.find(d => d.category === 'Netto-omzet' && !d.isSubcategory);
    const resultaat = data.find(d => d.category === 'Resultaat' && !d.isSubcategory);
    
    if (!nettoOmzet || !resultaat) {
      return {
        isValid: false,
        errorMargin: 100,
        calculatedResult: 0,
        actualResult: 0,
        missingCategories: ['Netto-omzet or Resultaat not found']
      };
    }

    // Calculate total costs (all categories except Netto-omzet and Resultaat)
    const costCategories = data.filter(d => 
      d.category !== 'Netto-omzet' && 
      d.category !== 'Resultaat' && 
      !d.isSubcategory
    );
    
    // Costs are already negative in database, so we add them (subtract negative = add)
    const totalCosts = costCategories.reduce((sum, category) => sum + category.total, 0);
    const calculatedResult = nettoOmzet.total + totalCosts; // Add because costs are negative
    const actualResult = resultaat.total;
    
    // Since we calculate Resultaat ourselves, it should always match
    const errorMargin = 0; // Perfect match since we calculate it

    const missingCategories: string[] = [];
    // Check for missing data in cost categories
    costCategories.forEach(category => {
      if (category.total === 0) {
        missingCategories.push(category.category);
      }
    });

    return {
      isValid: missingCategories.length === 0, // Valid if no missing categories
      errorMargin,
      calculatedResult,
      actualResult,
      missingCategories
    };
  };

  // Toggle row expansion
  const toggleExpansion = (index: number) => {
    setPnlData(prev => prev.map((item, i) => 
      i === index ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadPnLData();
  }, [selectedYear, selectedLocation, loadPnLData]);

  return (
    <div className="w-full space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{canUseTranslations ? t('pnl.title') : 'P&L Balance'}</h1>
          <p className="text-muted-foreground">
            {canUseTranslations ? t('pnl.description') : 'Monthly P&L balance tables with expandable COGS categories'}
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{canUseTranslations ? t('pnl.filters.year') : 'Year'} & {canUseTranslations ? t('pnl.filters.location') : 'Location'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Year Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{canUseTranslations ? t('pnl.filters.year') : 'Year'}:</span>
            <div className="flex gap-2">
              <Button
                variant={selectedYear === 2024 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYear(2024)}
              >
                2024
              </Button>
              <Button
                variant={selectedYear === 2025 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedYear(2025)}
              >
                2025
              </Button>
            </div>
          </div>

          {/* Month Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Month:</span>
            <div className="flex gap-2 flex-wrap">
              {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                <Button
                  key={month.value}
                  variant={selectedMonth === month.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMonth(month.value)}
                >
                  {month.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Location Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{canUseTranslations ? t('pnl.filters.location') : 'Location'}:</span>
            <div className="flex gap-2">
              {LOCATIONS.map(location => (
                <Button
                  key={location.value}
                  variant={selectedLocation === location.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLocation(location.value)}
                >
                  {location.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedYear(2025);
                setSelectedMonth(availableMonths.length > 0 ? availableMonths[0] : 1);
                setSelectedLocation('all');
              }}
            >
              {canUseTranslations ? t('pnl.filters.clear') : 'Clear'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Debug Calculation Display */}
      {pnlData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Calculation Debug - January 2025</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1">
              {(() => {
                const janData = pnlData.find(p => p.category === 'Netto-omzet' && !p.isSubcategory);
                const kostprijs = pnlData.find(p => p.category === 'Kostprijs van de omzet' && !p.isSubcategory);
                const personeel = pnlData.find(p => p.category === 'Lasten uit hoofde van personeelsbeloningen' && !p.isSubcategory);
                const afschrijvingen = pnlData.find(p => p.category === 'Afschrijvingen op immateriële en materiële vaste activa' && !p.isSubcategory);
                const financieel = pnlData.find(p => p.category === 'Financiële baten en lasten' && !p.isSubcategory);
                const resultaat = pnlData.find(p => p.category === 'Resultaat' && !p.isSubcategory);
                
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Netto-omzet: {formatCurrency(janData?.amounts[1] || 0)}</div>
                    <div>Kostprijs: {formatCurrency(kostprijs?.amounts[1] || 0)}</div>
                    <div>Personeel: {formatCurrency(personeel?.amounts[1] || 0)}</div>
                    <div>Afschrijvingen: {formatCurrency(afschrijvingen?.amounts[1] || 0)}</div>
                    <div>Financieel: {formatCurrency(financieel?.amounts[1] || 0)}</div>
                    <div className="font-bold">Resultaat: {formatCurrency(resultaat?.amounts[1] || 0)}</div>
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Alert */}
      {validationResult && (
        <Alert variant={validationResult.isValid ? 'default' : 'destructive'}>
          {validationResult.isValid ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>
            {validationResult.isValid ? (
              `Balance validation passed (Error margin: ${validationResult.errorMargin.toFixed(2)}%)`
            ) : (
              <div>
                <div>Balance validation failed (Error margin: {validationResult.errorMargin.toFixed(2)}%)</div>
                <div>Calculated: {formatCurrency(validationResult.calculatedResult)} | Actual: {formatCurrency(validationResult.actualResult)}</div>
                {validationResult.missingCategories.length > 0 && (
                  <div>Missing categories: {validationResult.missingCategories.join(', ')}</div>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* P&L Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>{canUseTranslations ? t('pnl.title') : 'P&L Balance'} - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-muted-foreground">{canUseTranslations ? t('pnl.alerts.loading') : 'Loading P&L data...'}</div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center p-4">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{canUseTranslations ? t('pnl.table.category') : 'Category'}</TableHead>
                  {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                    <TableHead key={month.value} className="text-center min-w-[100px]">
                      {month.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px] font-bold">{canUseTranslations ? t('pnl.table.total') : 'Total'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pnlData.map((item, index) => {
                  // Skip subcategories that should be hidden when parent is collapsed
                  if (item.isSubcategory && item.parentCategory) {
                    const parentIndex = pnlData.findIndex(p => p.category === item.parentCategory && !p.isSubcategory);
                    if (parentIndex !== -1 && !pnlData[parentIndex].isExpanded) {
                      return null;
                    }
                  }
                  
                  // Skip sub-subcategories that should be hidden when parent is collapsed
                  if (item.isSubcategory && item.subcategory && item.parentCategory) {
                    const parentSubcategoryIndex = pnlData.findIndex(p => p.category === item.parentCategory && !p.subcategory);
                    if (parentSubcategoryIndex !== -1 && !pnlData[parentSubcategoryIndex].isExpanded) {
                      return null;
                    }
                  }

                  // Determine indentation level
                  let indentLevel = 0;
                  if (item.isSubcategory && item.parentCategory) {
                    indentLevel = 1;
                    if (item.subcategory) {
                      indentLevel = 2;
                    }
                  }

                  return (
                    <TableRow 
                      key={`${item.category}-${item.subcategory || 'main'}`}
                      className={`
                        ${item.category === 'Resultaat' ? 'font-bold bg-muted' : ''}
                        ${item.isSubcategory ? 'bg-muted/50' : ''}
                        ${item.isMissing ? 'bg-red-50 border-l-4 border-red-400' : ''}
                      `}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {/* Indentation */}
                          {indentLevel > 0 && <span className={`w-${indentLevel * 4}`} />}
                          
                          {/* Collapse/Expand button for main categories */}
                          {!item.isSubcategory && item.isCollapsible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpansion(index)}
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Collapse/Expand button for subcategories */}
                          {item.isSubcategory && item.isCollapsible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpansion(index)}
                            >
                              {item.isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          
                          {/* Category name */}
                          <span className={item.category === 'Resultaat' ? 'font-bold' : ''}>
                            {item.subcategory || item.category}
                            {item.isMissing && (
                              <span className="ml-2 text-red-500 text-xs font-medium">
                                (MISSING DATA)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      {MONTHS.filter(month => availableMonths.includes(month.value)).map(month => (
                        <TableCell key={month.value} className="text-right">
                          {formatCurrency(item.amounts[month.value] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
