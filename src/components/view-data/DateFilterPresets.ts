import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";

export type DatePreset =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "last-quarter"
  | "this-year"
  | "last-year"
  | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Get date range for a preset, optionally filtered by year/month/day
 */
export function getDateRangeForPreset(
  preset: DatePreset,
  year?: number,
  month?: number | null,
  day?: number | null
): DateRange {
  const now = new Date();
  const currentYear = year || now.getFullYear();
  const currentMonth = month !== null && month !== undefined ? month : (month === null ? null : now.getMonth() + 1);
  const currentDay = day !== null && day !== undefined ? day : null;

  // If specific day is selected
  if (currentDay !== null && currentMonth !== null) {
    const date = new Date(currentYear, currentMonth - 1, currentDay);
    return {
      start: date,
      end: date,
    };
  }

  // If specific month is selected
  if (currentMonth !== null) {
    const start = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const end = new Date(currentYear, currentMonth - 1, lastDay);
    return {
      start,
      end,
    };
  }

  // If only year is selected
  if (year && !month) {
    return {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    };
  }

  // Handle presets
  switch (preset) {
    case "today": {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return {
        start: today,
        end: today,
      };
    }

    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return {
        start: yesterday,
        end: yesterday,
      };
    }

    case "this-week": {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return {
        start: startOfWeek,
        end: now,
      };
    }

    case "last-week": {
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - now.getDay() - 7);
      startOfLastWeek.setHours(0, 0, 0, 0);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      endOfLastWeek.setHours(23, 59, 59, 999);
      return {
        start: startOfLastWeek,
        end: endOfLastWeek,
      };
    }

    case "this-month": {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        start,
        end,
      };
    }

    case "last-month": {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      return {
        start,
        end,
      };
    }

    case "this-quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      return {
        start: quarterStart,
        end: quarterEnd,
      };
    }

    case "last-quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const lastQuarterYear = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const quarterStart = new Date(lastQuarterYear, lastQuarter * 3, 1);
      const quarterEnd = new Date(lastQuarterYear, lastQuarter * 3 + 3, 0);
      return {
        start: quarterStart,
        end: quarterEnd,
      };
    }

    case "this-year": {
      const start = startOfYear(now);
      const end = endOfYear(now);
      return {
        start,
        end,
      };
    }

    case "last-year": {
      const lastYear = now.getFullYear() - 1;
      return {
        start: new Date(lastYear, 0, 1),
        end: new Date(lastYear, 11, 31),
      };
    }

    case "custom":
    default:
      // Default to last month
      const defaultStart = subMonths(now, 1);
      return {
        start: startOfMonth(defaultStart),
        end: endOfMonth(now),
      };
  }
}

