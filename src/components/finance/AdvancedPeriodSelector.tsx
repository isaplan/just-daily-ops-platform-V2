import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { getSeasonFromDate } from "@/lib/dateUtils";

export type PeriodPreset = "3months" | "6months" | "quarter" | "season" | "year" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

interface AdvancedPeriodSelectorProps {
  value: PeriodPreset;
  onChange: (preset: PeriodPreset, dateRange: DateRange) => void;
  customRange?: DateRange;
}

export function AdvancedPeriodSelector({
  value,
  onChange,
  customRange,
}: AdvancedPeriodSelectorProps) {
  const handlePresetChange = (preset: PeriodPreset) => {
    const now = new Date();
    let dateRange: DateRange;

    switch (preset) {
      case "3months":
        dateRange = {
          start: subMonths(now, 3),
          end: now,
        };
        break;
      case "6months":
        dateRange = {
          start: subMonths(now, 6),
          end: now,
        };
        break;
      case "quarter":
        dateRange = {
          start: startOfQuarter(now),
          end: endOfQuarter(now),
        };
        break;
      case "season":
        const season = getSeasonFromDate(now);
        dateRange = getSeasonDateRange(season, now.getFullYear());
        break;
      case "year":
        dateRange = {
          start: startOfYear(now),
          end: endOfYear(now),
        };
        break;
      case "custom":
        dateRange = customRange || { start: subMonths(now, 1), end: now };
        break;
      default:
        dateRange = { start: subMonths(now, 3), end: now };
    }

    onChange(preset, dateRange);
  };

  return (
    <div className="flex gap-2 items-center">
      <Select value={value} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="3months">Last 3 Months</SelectItem>
          <SelectItem value="6months">Last 6 Months</SelectItem>
          <SelectItem value="quarter">This Quarter</SelectItem>
          <SelectItem value="season">This Season</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {value === "custom" && customRange && (
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(customRange.start, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customRange.start}
                onSelect={(date) => date && onChange("custom", { ...customRange, start: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(customRange.end, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customRange.end}
                onSelect={(date) => date && onChange("custom", { ...customRange, end: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

function getSeasonDateRange(season: string, year: number): DateRange {
  switch (season) {
    case "Spring":
      return { start: new Date(year, 2, 1), end: new Date(year, 4, 31) };
    case "Summer":
      return { start: new Date(year, 5, 1), end: new Date(year, 7, 31) };
    case "Fall":
      return { start: new Date(year, 8, 1), end: new Date(year, 10, 30) };
    case "Winter":
      return { start: new Date(year - 1, 11, 1), end: new Date(year, 1, 28) };
    default:
      return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) };
  }
}
