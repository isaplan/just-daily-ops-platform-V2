"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subYears, startOfYear, endOfYear } from "date-fns";

export type PeriodPreset = 
  | "this-month"
  | "last-month" 
  | "year-ago"
  | "2-years-ago"
  | "3months"
  | "6months"
  | "quarter"
  | "year"
  | "last-year"
  | "year-2023"
  | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

interface SmartPeriodSelectorProps {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset, dateRange: DateRange) => void;
  customRange?: DateRange;
  label?: string;
}

const PERIOD_PRESETS = [
  { value: "this-month" as const, label: "This Month" },
  { value: "last-month" as const, label: "Last Month" },
  { value: "3months" as const, label: "Last 3 Months" },
  { value: "6months" as const, label: "Last 6 Months" },
  { value: "quarter" as const, label: "This Quarter" },
  { value: "year" as const, label: "This Year" },
  { value: "last-year" as const, label: "Last Year" },
  { value: "year-2023" as const, label: "2023" },
  { value: "custom" as const, label: "Custom Range" },
];

export function getDateRangeForPreset(preset: PeriodPreset, customRange?: DateRange): DateRange {
  const now = new Date();
  
  switch (preset) {
    case "this-month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    
    case "last-month":
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth)
      };
    
    case "year-ago":
      const yearAgo = subMonths(now, 12);
      return {
        start: startOfMonth(yearAgo),
        end: endOfMonth(yearAgo)
      };
    
    case "2-years-ago":
      const twoYearsAgo = subMonths(now, 24);
      return {
        start: startOfMonth(twoYearsAgo),
        end: endOfMonth(twoYearsAgo)
      };
    
    case "3months":
      const threeMonthsAgo = subMonths(now, 3);
      return {
        start: startOfMonth(threeMonthsAgo),
        end: endOfMonth(now)
      };
    
    case "6months":
      const sixMonthsAgo = subMonths(now, 6);
      return {
        start: startOfMonth(sixMonthsAgo),
        end: endOfMonth(now)
      };
    
    case "quarter":
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return {
        start: startOfMonth(quarterStart),
        end: endOfMonth(now)
      };
    
    case "year":
      return {
        start: startOfYear(now),
        end: endOfMonth(now)
      };
    
    case "last-year":
      return {
        start: new Date(2024, 0, 1),
        end: new Date(2024, 11, 31)
      };
    
    case "year-2023":
      return {
        start: new Date(2023, 0, 1),
        end: new Date(2023, 11, 31)
      };
    
    case "custom":
      return customRange || {
        start: startOfMonth(subMonths(now, 1)),
        end: endOfMonth(now)
      };
    
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
  }
}

export default function SmartPeriodSelector({ 
  value, 
  onChange, 
  customRange,
  label = "Period" 
}: SmartPeriodSelectorProps) {
  const handlePresetChange = (preset: PeriodPreset) => {
    const dateRange = getDateRangeForPreset(preset, customRange);
    onChange(preset, dateRange);
  };

  const currentRange = value === "custom" && customRange 
    ? customRange 
    : getDateRangeForPreset(value, customRange);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2 items-center flex-wrap">
        <Select value={value} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map(preset => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {value === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(currentRange.start, "MMM d, yyyy")} - {format(currentRange.end, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: currentRange.start,
                  to: currentRange.end
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onChange("custom", { start: range.from, end: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        {value !== "custom" && (
          <span className="text-sm text-muted-foreground">
            {format(currentRange.start, "MMM d, yyyy")} - {format(currentRange.end, "MMM d, yyyy")}
          </span>
        )}
      </div>
    </div>
  );
}