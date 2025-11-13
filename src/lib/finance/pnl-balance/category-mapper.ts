/**
 * P&L Category Mapper
 * 
 * Maps database categories to display categories
 * Modular mapping functions for maintainability
 */

export interface CategoryMapping {
  dbCategory: string;
  displayCategory: string;
  parentCategory?: string;
  isCollapsible: boolean;
}

/**
 * Revenue category mappings
 */
export const REVENUE_MAPPINGS: CategoryMapping[] = [
  {
    dbCategory: 'Netto-omzet groepen',
    displayCategory: 'Netto-omzet groepen',
    isCollapsible: true
  },
  {
    dbCategory: 'Netto-omzet uit leveringen geproduceerde goederen',
    displayCategory: 'Netto-omzet uit leveringen geproduceerde goederen',
    parentCategory: 'Netto-omzet groepen',
    isCollapsible: true
  },
  {
    dbCategory: 'Netto-omzet uit verkoop van handelsgoederen',
    displayCategory: 'Netto-omzet uit verkoop van handelsgoederen',
    parentCategory: 'Netto-omzet groepen',
    isCollapsible: true
  }
];

/**
 * Cost of Sales category mappings
 */
export const COST_OF_SALES_MAPPINGS: CategoryMapping[] = [
  {
    dbCategory: 'Kostprijs van de omzet',
    displayCategory: 'Kostprijs van de omzet',
    isCollapsible: true
  },
  {
    dbCategory: 'Inkoopwaarde handelsgoederen',
    displayCategory: 'Inkoopwaarde handelsgoederen',
    parentCategory: 'Kostprijs van de omzet',
    isCollapsible: true
  }
];

/**
 * Labor Cost category mappings
 */
export const LABOR_MAPPINGS: CategoryMapping[] = [
  {
    dbCategory: 'Arbeidskosten',
    displayCategory: 'Arbeidskosten',
    isCollapsible: true
  },
  {
    dbCategory: 'Contract Arbeid',
    displayCategory: 'Contract Arbeid',
    parentCategory: 'Arbeidskosten',
    isCollapsible: true
  },
  {
    dbCategory: 'Flex Arbeid',
    displayCategory: 'Flex Arbeid',
    parentCategory: 'Arbeidskosten',
    isCollapsible: true
  },
  {
    dbCategory: 'Overige Arbeid',
    displayCategory: 'Overige Arbeid',
    parentCategory: 'Arbeidskosten',
    isCollapsible: true
  }
];

/**
 * Other Costs category mappings (not collapsible per user request)
 */
export const OTHER_COSTS_MAPPINGS: CategoryMapping[] = [
  {
    dbCategory: 'Overige bedrijfskosten',
    displayCategory: 'Overige bedrijfskosten',
    isCollapsible: false
  },
  {
    dbCategory: 'Afschrijvingen op immateriële en materiële vaste activa',
    displayCategory: 'Afschrijvingen op immateriële en materiële vaste activa',
    isCollapsible: false
  },
  {
    dbCategory: 'Financiële baten en lasten',
    displayCategory: 'Financiële baten en lasten',
    isCollapsible: false
  }
];

/**
 * Get all category mappings
 */
export function getAllMappings(): CategoryMapping[] {
  return [
    ...REVENUE_MAPPINGS,
    ...COST_OF_SALES_MAPPINGS,
    ...LABOR_MAPPINGS,
    ...OTHER_COSTS_MAPPINGS
  ];
}

/**
 * Find mapping by database category name
 */
export function findMappingByDbCategory(dbCategory: string): CategoryMapping | undefined {
  return getAllMappings().find(m => m.dbCategory === dbCategory);
}

/**
 * Find mapping by display category name
 */
export function findMappingByDisplayCategory(displayCategory: string): CategoryMapping | undefined {
  return getAllMappings().find(m => m.displayCategory === displayCategory);
}

