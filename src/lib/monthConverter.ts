const DUTCH_MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  maa: 3, // maart
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  okt: 10,
  nov: 11,
  dec: 12,
  // Full names
  januari: 1,
  februari: 2,
  maart: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  augustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

export function dutchMonthToNumber(month: string): number {
  const normalized = month.toLowerCase().trim();
  const result = DUTCH_MONTHS[normalized];
  
  // If exact match fails, try partial match (first 3 chars)
  if (!result && normalized.length >= 3) {
    const prefix = normalized.substring(0, 3);
    const partialResult = DUTCH_MONTHS[prefix];
    if (partialResult) {
      console.log(`Month partial match: "${month}" -> "${prefix}" -> ${partialResult}`);
      return partialResult;
    }
  }
  
  if (!result) {
    console.warn(`Failed to match month: "${month}"`);
  }
  
  return result || 0;
}

export function getDateRangeFromMonths(
  year: number,
  months: string[]
): { start: string; end: string } | null {
  if (!months.length) return null;

  const monthNumbers = months
    .map(dutchMonthToNumber)
    .filter((m) => m > 0)
    .sort((a, b) => a - b);

  if (!monthNumbers.length) return null;

  const firstMonth = monthNumbers[0];
  const lastMonth = monthNumbers[monthNumbers.length - 1];

  // Create dates (first day of first month, last day of last month)
  const start = new Date(year, firstMonth - 1, 1);
  const end = new Date(year, lastMonth, 0); // Day 0 = last day of previous month

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  if (!start) return end || '';
  if (!end) return start;
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startMonth = startDate.toLocaleString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleString('en-US', { month: 'short' });
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  
  if (startMonth === endMonth && startYear === endYear) {
    return `${startMonth} ${startYear}`;
  }
  
  if (startYear === endYear) {
    return `${startMonth} - ${endMonth} ${startYear}`;
  }
  
  return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
}
