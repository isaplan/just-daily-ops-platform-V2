/**
 * PNL Balance Analysis Model Layer
 * Type definitions for PNL Balance Analysis page
 */

export interface Location {
  id: string;
  name: string;
}

export interface ComparisonItem {
  key: string;
  label: string;
  accountantValue: number;
  calculatedValue: number;
  difference: number;
  percentageDifference: number;
  isMatch: boolean;
  expectedCategories: string[];
}

export interface ComparisonSummary {
  totalCategories: number;
  matchingCategories: number;
  categoriesWithDifferences: number;
}

export interface ComparisonData {
  comparison: ComparisonItem[];
  summary: ComparisonSummary;
}

export interface HierarchySubSub {
  glAccount: string;
  amount: number;
  recordCount: number;
}

export interface HierarchySub {
  sub: string;
  subSubs: HierarchySubSub[];
  totalAmount: number;
  recordCount: number;
}

export interface HierarchyNode {
  main: string;
  subs: HierarchySub[];
  totalAmount: number;
  recordCount: number;
}

export interface HierarchySummary {
  totalMainCategories: number;
  totalSubCategories: number;
  totalSubSubCategories: number;
  totalAmount: number;
}

export interface HierarchyData {
  hierarchy: HierarchyNode[];
  summary: HierarchySummary;
  mappingReport: MappingReportItem[];
}

export interface MappingReportItem {
  accountantCategory: string;
  totalAmount: number;
  totalRecords: number;
  matchCount: number;
  expectedCategories: string[];
  matchedMainCategories: string[];
}

export interface AnalysisQueryParams {
  location: string;
  year: number;
  month: number;
}



