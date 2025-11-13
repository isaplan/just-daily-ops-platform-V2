/**
 * P&L Balance Utilities
 * Helper functions for processing P&L balance data
 */

import type {
  AggregatedPnLRecord,
  ProcessedPnLData,
  MonthOption,
} from "@/models/finance/pnl-balance.model";

/**
 * Map aggregated P&L data to display format
 */
export function mapAggregatedToDisplay(
  aggregatedData: AggregatedPnLRecord[],
  months: MonthOption[]
): ProcessedPnLData[] {
  const processed: ProcessedPnLData[] = [];

  // REVENUE
  const nettoOmzet: ProcessedPnLData = {
    category: "Netto-omzet groepen",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: false,
    isCollapsible: true,
  };

  const nettoOmzetLevering: ProcessedPnLData = {
    category: "Netto-omzet uit leveringen geproduceerde goederen",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Netto-omzet groepen",
    isCollapsible: true,
  };

  const nettoOmzetHandel: ProcessedPnLData = {
    category: "Netto-omzet uit verkoop van handelsgoederen",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Netto-omzet groepen",
    isCollapsible: true,
  };

  // COST OF SALES
  const kostprijs: ProcessedPnLData = {
    category: "Kostprijs van de omzet",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: false,
    isCollapsible: true,
  };

  const inkoopwaarde: ProcessedPnLData = {
    category: "Inkoopwaarde handelsgoederen",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Kostprijs van de omzet",
  };

  // LABOR COSTS
  const arbeidskosten: ProcessedPnLData = {
    category: "Arbeidskosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: false,
    isCollapsible: true,
  };

  const contractArbeid: ProcessedPnLData = {
    category: "Contract Arbeid",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Arbeidskosten",
    isCollapsible: true,
  };

  const flexArbeid: ProcessedPnLData = {
    category: "Flex Arbeid",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Arbeidskosten",
    isCollapsible: true,
  };

  // OTHER COSTS
  const overigeBedrijfskosten: ProcessedPnLData = {
    category: "Overige bedrijfskosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: false,
    isCollapsible: true,
  };

  const huisvestingskosten: ProcessedPnLData = {
    category: "Huisvestingskosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const exploitatieKosten: ProcessedPnLData = {
    category: "Exploitatie- en machinekosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const verkoopKosten: ProcessedPnLData = {
    category: "Verkoop gerelateerde kosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const autokosten: ProcessedPnLData = {
    category: "Autokosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const kantoorkosten: ProcessedPnLData = {
    category: "Kantoorkosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const assurantiekosten: ProcessedPnLData = {
    category: "Assurantiekosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const accountantskosten: ProcessedPnLData = {
    category: "Accountants- en advieskosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const administratieveLasten: ProcessedPnLData = {
    category: "Administratieve lasten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const andereKosten: ProcessedPnLData = {
    category: "Andere kosten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const afschrijvingen: ProcessedPnLData = {
    category: "Afschrijvingen op immateriële en materiële vaste activa",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  const financieel: ProcessedPnLData = {
    category: "Financiële baten en lasten",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: true,
    parentCategory: "Overige bedrijfskosten",
  };

  // RESULTAAT
  const resultaat: ProcessedPnLData = {
    category: "Resultaat",
    subcategory: null,
    amounts: {},
    total: 0,
    isExpanded: false,
    isSubcategory: false,
  };

  // Process each month's data
  months.forEach((month) => {
    const monthData = aggregatedData.filter((item) => item.month === month.value);

    if (monthData.length === 0) {
      // Set all to 0 for months without data
      [nettoOmzet, nettoOmzetLevering, nettoOmzetHandel, kostprijs, inkoopwaarde, arbeidskosten, contractArbeid, flexArbeid, overigeBedrijfskosten, huisvestingskosten, exploitatieKosten, verkoopKosten, autokosten, kantoorkosten, assurantiekosten, accountantskosten, administratieveLasten, andereKosten, afschrijvingen, financieel, resultaat].forEach(
        (item) => {
          item.amounts[month.value] = 0;
        }
      );
      return;
    }

    // Aggregate values for this month
    const revenueLeveringTotal = monthData.reduce(
      (sum: number, item) => sum + (item.netto_omzet_uit_levering_geproduceerd || 0),
      0
    );
    const revenueHandelTotal = monthData.reduce(
      (sum: number, item) => sum + (item.netto_omzet_verkoop_handelsgoederen || 0),
      0
    );
    const revenueTotal = revenueLeveringTotal + revenueHandelTotal;

    const costInkoopTotal = monthData.reduce(
      (sum: number, item) => sum + (item.inkoopwaarde_handelsgoederen || 0),
      0
    );

    const laborTotal = monthData.reduce(
      (sum: number, item) => sum + (item.labor_total || item.lonen_en_salarissen || 0),
      0
    );
    const laborContractTotal = monthData.reduce(
      (sum: number, item) => sum + (item.labor_contract || 0),
      0
    );
    const laborFlexTotal = monthData.reduce(
      (sum: number, item) => sum + (item.labor_flex || 0),
      0
    );

    const otherTotal = monthData.reduce(
      (sum: number, item) => sum + (item.other_costs_total || 0),
      0
    );

    const huisvestingskostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.huisvestingskosten || 0),
      0
    );
    const exploitatieKostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.exploitatie_kosten || 0),
      0
    );
    const verkoopKostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.verkoop_kosten || 0),
      0
    );
    const autokostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.autokosten || 0),
      0
    );
    const kantoorkostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.kantoorkosten || 0),
      0
    );
    const assurantiekostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.assurantiekosten || 0),
      0
    );
    const accountantskostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.accountantskosten || 0),
      0
    );
    const administratieveLastenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.administratieve_lasten || 0),
      0
    );
    const andereKostenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.andere_kosten || 0),
      0
    );
    const afschrijvingenTotal = monthData.reduce(
      (sum: number, item) => sum + (item.afschrijvingen || 0),
      0
    );
    const financieelTotal = monthData.reduce(
      (sum: number, item) => sum + (item.financiele_baten_lasten || 0),
      0
    );

    const resultaatTotal = monthData.reduce(
      (sum: number, item) => sum + (item.resultaat || 0),
      0
    );

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

    overigeBedrijfskosten.amounts[month.value] = otherTotal;
    overigeBedrijfskosten.total += otherTotal;

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
}

/**
 * Validate balance with error margin
 */
export function validateBalance(
  data: ProcessedPnLData[]
): {
  isValid: boolean;
  errorMargin: number;
  calculatedResult: number;
  actualResult: number;
  missingCategories: string[];
} {
  const nettoOmzet = data.find(
    (d) => d.category === "Netto-omzet groepen" && !d.isSubcategory
  );
  const resultaat = data.find((d) => d.category === "Resultaat" && !d.isSubcategory);

  if (!nettoOmzet || !resultaat) {
    return {
      isValid: false,
      errorMargin: 100,
      calculatedResult: 0,
      actualResult: 0,
      missingCategories: ["Netto-omzet groepen or Resultaat not found"],
    };
  }

  const costCategories = data.filter(
    (d) =>
      d.category !== "Netto-omzet groepen" &&
      d.category !== "Resultaat" &&
      !d.isSubcategory
  );

  const totalCosts = costCategories.reduce((sum, category) => sum + category.total, 0);
  const calculatedResult = nettoOmzet.total + totalCosts;
  const actualResult = resultaat.total;

  const missingCategories: string[] = [];
  costCategories.forEach((category) => {
    if (category.total === 0) {
      missingCategories.push(category.category);
    }
  });

  return {
    isValid: missingCategories.length === 0,
    errorMargin: 0,
    calculatedResult,
    actualResult,
    missingCategories,
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
