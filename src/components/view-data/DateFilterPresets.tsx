"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears
} from "date-fns";

export type DatePreset = 
  | "today" 
  | "yesterday" 
  | "this-week" 
  | "last-week" 
  | "this-month" 
  | "last-month" 
  | "this-year" 
  | "last-year"
  | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeForPreset(preset: DatePreset): DateRange | null {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return {
        start: startOfDay(now),
        end: endOfDay(now)
      };
    
    case "yesterday":
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday)
      };
    
    case "this-week":
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(now, { weekStartsOn: 1 })
      };
    
    case "last-week":
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      return {
        start: lastWeekStart,
        end: lastWeekEnd
      };
    
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
    
    case "this-year":
      return {
        start: startOfYear(now),
        end: endOfYear(now)
      };
    
    case "last-year":
      const lastYear = subYears(now, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear)
      };
    
    case "custom":
      return null; // User will set custom range
    
    default:
      return null;
  }
}

interface DateFilterPresetsProps {
  selectedPreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  className?: string;
  disabled?: boolean;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "last-week", label: "Last Week" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "this-year", label: "This Year" },
  { value: "last-year", label: "Last Year" },
];

export function DateFilterPresets({
  selectedPreset,
  onPresetChange,
  className,
  disabled = false,
}: DateFilterPresetsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <span className="text-sm font-bold text-foreground">Filters</span>
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((preset) => {
          const isActive = selectedPreset === preset.value;
          return (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              disabled={disabled}
              className={`border rounded-sm ${
                disabled
                  ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  : isActive
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
              }`}
              onClick={() => onPresetChange(preset.value)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}










