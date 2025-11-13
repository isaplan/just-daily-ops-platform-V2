import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears, format, isSameDay } from "date-fns";

export type PeriodType = "day" | "week" | "month" | "quarter" | "year";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getPeriodRange(period: PeriodType, date: Date = new Date()): DateRange {
  switch (period) {
    case "day":
      return { start: date, end: date };
    case "week":
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case "quarter":
      return { start: startOfQuarter(date), end: endOfQuarter(date) };
    case "year":
      return { start: startOfYear(date), end: endOfYear(date) };
  }
}

export function getPreviousPeriod(period: PeriodType, date: Date, count: number = 1): Date {
  switch (period) {
    case "day":
      return subDays(date, count);
    case "week":
      return subWeeks(date, count);
    case "month":
      return subMonths(date, count);
    case "quarter":
      return subQuarters(date, count);
    case "year":
      return subYears(date, count);
  }
}

export function getSameDayOfWeekPrevious(date: Date, weeksBack: number = 1): Date[] {
  const results: Date[] = [];
  for (let i = 1; i <= weeksBack; i++) {
    results.push(subWeeks(date, i));
  }
  return results;
}

export function formatPeriodLabel(period: PeriodType, date: Date = new Date()): string {
  switch (period) {
    case "day":
      return format(date, "EEEE, MMMM d, yyyy");
    case "week":
      return `Week of ${format(startOfWeek(date, { weekStartsOn: 1 }), "MMM d, yyyy")}`;
    case "month":
      return format(date, "MMMM yyyy");
    case "quarter":
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      return `Q${quarter} ${date.getFullYear()}`;
    case "year":
      return format(date, "yyyy");
    default:
      return format(date, "MMMM d, yyyy");
  }
}

export function formatDateForQuery(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function getDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getWeeksBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
}

export function getMonthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export function getQuartersBetween(start: Date, end: Date): number {
  const startQuarter = Math.ceil((start.getMonth() + 1) / 3);
  const endQuarter = Math.ceil((end.getMonth() + 1) / 3);
  const yearDiff = end.getFullYear() - start.getFullYear();
  return yearDiff * 4 + (endQuarter - startQuarter);
}

export function getYearsBetween(start: Date, end: Date): number {
  return end.getFullYear() - start.getFullYear();
}