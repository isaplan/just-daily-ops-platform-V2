/**
 * Maps PowerBI categories to hierarchical structure
 * Based on Excel files: barbea, lamour, kinsbergen
 */

export interface CategoryMapping {
  level1: string;
  level2: string | null;
  level3: string | null;
}

/**
 * Category hierarchy from PowerBI Excel files
 */
const CATEGORY_HIERARCHY: Record<string, CategoryMapping> = {
  // === REVENUE ===
  "Netto-omzet": {
    level1: "Revenue",
    level2: "Net Revenue",
    level3: null
  },
  "Omzet (incl. btw)": {
    level1: "Revenue",
    level2: "Gross Revenue",
    level3: null
  },
  
  // === COGS ===
  "Kostprijs van de omzet": {
    level1: "COGS",
    level2: "Total COGS",
    level3: null
  },
  "Inkoop keuken": {
    level1: "COGS",
    level2: "Kitchen",
    level3: null
  },
  "Inkoop bier, wijn, sterke drank en overig dranken": {
    level1: "COGS",
    level2: "Beverages",
    level3: null
  },
  "Inkoop bier en wijn": {
    level1: "COGS",
    level2: "Beer & Wine",
    level3: null
  },
  "Inkoop sterke drank": {
    level1: "COGS",
    level2: "Spirits",
    level3: null
  },
  "Inkoop overig dranken": {
    level1: "COGS",
    level2: "Non-Alcoholic",
    level3: null
  },
  
  // === LABOR ===
  "Lasten uit hoofde van personeelsbeloningen": {
    level1: "Labor",
    level2: "Total Labor",
    level3: null
  },
  "Lonen en salarissen": {
    level1: "Labor",
    level2: "Wages & Salaries",
    level3: null
  },
  "Sociale lasten": {
    level1: "Labor",
    level2: "Social Charges",
    level3: null
  },
  "Pensioenlasten": {
    level1: "Labor",
    level2: "Pension",
    level3: null
  },
  
  // === OPEX ===
  "Overige bedrijfskosten": {
    level1: "OPEX",
    level2: "Total Operating Expenses",
    level3: null
  },
  "Huisvestingskosten": {
    level1: "OPEX",
    level2: "Rent & Premises",
    level3: null
  },
  "Gas, water en elektriciteit": {
    level1: "OPEX",
    level2: "Utilities",
    level3: null
  },
  "Onderhoudskosten": {
    level1: "OPEX",
    level2: "Maintenance",
    level3: null
  },
  "Reclame- en verkoopkosten": {
    level1: "OPEX",
    level2: "Marketing",
    level3: null
  },
  "Verzekeringen": {
    level1: "OPEX",
    level2: "Insurance",
    level3: null
  },
  "Algemene kosten": {
    level1: "OPEX",
    level2: "Administrative",
    level3: null
  },
  
  // === DEPRECIATION ===
  "Afschrijvingen op immateriële en materiële vaste activa": {
    level1: "Depreciation",
    level2: null,
    level3: null
  },
  "Afschrijvingen": {
    level1: "Depreciation",
    level2: null,
    level3: null
  },
  
  // === FINANCE ===
  "Financiële baten en lasten": {
    level1: "Finance",
    level2: "Finance Costs",
    level3: null
  }
};

/**
 * Map a category string to hierarchical levels
 */
export function mapCategoryToHierarchy(category: string): CategoryMapping {
  const normalized = category.trim();
  
  if (CATEGORY_HIERARCHY[normalized]) {
    return CATEGORY_HIERARCHY[normalized];
  }
  
  // Fallback: detect from keywords
  const lower = normalized.toLowerCase();
  
  if (lower.includes("omzet") || lower.includes("revenue")) {
    return { level1: "Revenue", level2: normalized, level3: null };
  }
  if (lower.includes("kostprijs") || lower.includes("inkoop") || lower.includes("cogs")) {
    return { level1: "COGS", level2: normalized, level3: null };
  }
  if (lower.includes("lonen") || lower.includes("salaris") || lower.includes("personeels")) {
    return { level1: "Labor", level2: normalized, level3: null };
  }
  if (lower.includes("bedrijfskosten") || lower.includes("opex")) {
    return { level1: "OPEX", level2: normalized, level3: null };
  }
  if (lower.includes("afschrij") || lower.includes("deprec")) {
    return { level1: "Depreciation", level2: normalized, level3: null };
  }
  if (lower.includes("financ")) {
    return { level1: "Finance", level2: normalized, level3: null };
  }
  
  return { level1: "Other", level2: normalized, level3: null };
}

/**
 * Map category to summary table field name
 */
export function mapCategoryToSummaryField(categoryL1: string, categoryL2: string | null): string | null {
  switch (categoryL1) {
    case "Revenue":
      if (categoryL2?.includes("Net") || categoryL2?.includes("Netto")) return "revenue_net";
      if (categoryL2?.includes("Gross") || categoryL2?.includes("incl")) return "revenue_gross";
      return "revenue_net";
    
    case "COGS":
      if (!categoryL2 || categoryL2.includes("Total")) return "cogs_total";
      const lowerL2 = categoryL2.toLowerCase();
      if (lowerL2.includes("kitchen") || lowerL2.includes("keuken")) return "cogs_kitchen";
      if (lowerL2.includes("beer") || lowerL2.includes("bier") || lowerL2.includes("wijn")) return "cogs_beer_wine";
      if (lowerL2.includes("spirit") || lowerL2.includes("sterke")) return "cogs_spirits";
      if (lowerL2.includes("non-alc") || lowerL2.includes("overig")) return "cogs_non_alcoholic";
      return "cogs_other";
    
    case "Labor":
      if (!categoryL2 || categoryL2.includes("Total")) return "labor_cost_total";
      const lowerLabor = categoryL2.toLowerCase();
      if (lowerLabor.includes("wage") || lowerLabor.includes("lonen") || lowerLabor.includes("salaris")) return "labor_wages_salaries";
      if (lowerLabor.includes("social") || lowerLabor.includes("sociale")) return "labor_social_charges";
      if (lowerLabor.includes("pension") || lowerLabor.includes("pensioen")) return "labor_pension";
      return "labor_other";
    
    case "OPEX":
      if (!categoryL2 || categoryL2.includes("Total")) return "opex_total";
      const lowerOpex = categoryL2.toLowerCase();
      if (lowerOpex.includes("rent") || lowerOpex.includes("huur") || lowerOpex.includes("huisvest")) return "opex_rent";
      if (lowerOpex.includes("utilit") || lowerOpex.includes("gas") || lowerOpex.includes("water") || lowerOpex.includes("elektr")) return "opex_utilities";
      if (lowerOpex.includes("mainten") || lowerOpex.includes("onderhoud")) return "opex_maintenance";
      if (lowerOpex.includes("market") || lowerOpex.includes("reclame") || lowerOpex.includes("verkoop")) return "opex_marketing";
      if (lowerOpex.includes("insur") || lowerOpex.includes("verzeker")) return "opex_insurance";
      if (lowerOpex.includes("admin") || lowerOpex.includes("algemene")) return "opex_administrative";
      return "opex_other";
    
    case "Depreciation":
      return "depreciation";
    
    case "Finance":
      return "finance_costs";
    
    default:
      return null;
  }
}
