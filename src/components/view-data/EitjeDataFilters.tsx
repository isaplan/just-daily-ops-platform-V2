"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateFilterPresets, DatePreset } from "./DateFilterPresets";
import { useMemo, memo } from "react";

interface EitjeDataFiltersProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  selectedMonth: number | null;
  onMonthChange: (month: number | null) => void;
  selectedDay: number | null;
  onDayChange: (day: number | null) => void;
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  selectedDatePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  locations?: Array<{ value: string; label: string }>;
  onResetToDefault?: () => void;
}

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

// Filter out "All HNHG Locations" - not a real location
const filterValidLocations = (locations: Array<{ value: string; label: string }>) => {
  return locations.filter(loc => 
    loc.label !== "All HNHG Locations" && 
    loc.label !== "All HNG Locations"
  );
};

export const EitjeDataFilters = memo(function EitjeDataFilters({
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  selectedDay,
  onDayChange,
  selectedLocation,
  onLocationChange,
  selectedDatePreset,
  onDatePresetChange,
  locations = [{ value: "all", label: "All Locations" }],
  onResetToDefault,
}: EitjeDataFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  
  // Calculate available days for selected month
  const availableDays = useMemo(() => {
    if (!selectedMonth) return [];
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, [selectedYear, selectedMonth]);

  // Filter out invalid locations and ensure "all" is only added once
  const validLocations = useMemo(() => {
    const filtered = filterValidLocations(locations);
    // Check if "all" already exists in filtered locations
    const hasAll = filtered.some(loc => loc.value === "all");
    return hasAll 
      ? filtered 
      : [
          { value: "all", label: "All Locations" },
          ...filtered,
        ];
  }, [locations]);

  // Year/Month dropdown value
  const yearMonthValue = selectedMonth 
    ? `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`
    : `${selectedYear}-all`;

  const handleYearMonthChange = (value: string) => {
    const [year, month] = value.split("-");
    onYearChange(Number(year));
    const monthNum = month === "all" ? null : Number(month);
    onMonthChange(monthNum);
    // Clear day and date preset when month changes
    if (monthNum !== null) {
      onDatePresetChange("custom");
    } else {
      onDayChange(null);
    }
  };
  
  const handleDayChange = (value: string) => {
    const day = value === "all" ? null : Number(value);
    onDayChange(day);
    if (day !== null) {
      onDatePresetChange("custom");
    }
  };

  return (
    <div className="space-y-4">
      {/* Year with Month Dropdown */}
      <div className="space-y-2">
        <span className="text-sm font-bold text-foreground">Year</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {years.map((year) => {
              const isActive = selectedYear === year;
              return (
                <Button
                  key={year}
                  variant="outline"
                  size="sm"
                  className={`border rounded-sm ${
                    isActive
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                  }`}
                  onClick={() => {
                    onYearChange(year);
                    if (selectedMonth) onMonthChange(null); // Clear month when changing year
                  }}
                >
                  {year}
                </Button>
              );
            })}
          </div>
          <Select value={yearMonthValue} onValueChange={handleYearMonthChange}>
            <SelectTrigger 
              className={`min-w-[140px] w-auto border rounded-sm ${
                selectedMonth !== null
                  ? "bg-blue-500 border-blue-500 text-white [&>svg]:text-white [&>span]:text-white"
                  : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
              }`}
            >
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={`${selectedYear}-all`}>Month</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={`${selectedYear}-${String(month.value).padStart(2, "0")}`}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={selectedDay !== null ? String(selectedDay) : "all"} 
            onValueChange={handleDayChange}
            disabled={selectedMonth === null}
          >
            <SelectTrigger 
              className={`min-w-[100px] w-auto border rounded-sm ${
                selectedMonth === null
                  ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                  : selectedDay !== null
                  ? "bg-blue-500 border-blue-500 text-white [&>svg]:text-white [&>span]:text-white"
                  : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
              }`}
            >
              <SelectValue placeholder="Day" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Day</SelectItem>
              {availableDays.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {String(day).padStart(2, "0")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Filters */}
      <div>
        <DateFilterPresets
          selectedPreset={selectedDatePreset}
          onPresetChange={(preset) => {
            onDatePresetChange(preset);
            // Clear month and day selection when a preset is selected
            if (selectedMonth !== null) {
              onMonthChange(null);
            }
            if (selectedDay !== null) {
              onDayChange(null);
            }
          }}
          disabled={selectedMonth !== null}
        />
      </div>
      
      {/* Reset to Default Button */}
      {onResetToDefault && (
        <div>
          <Button
            variant="outline"
            size="sm"
            className="border border-black rounded-sm bg-white hover:bg-gray-100"
            onClick={onResetToDefault}
          >
            Reset to Default
          </Button>
        </div>
      )}

      {/* Location - Single Select */}
      <div className="space-y-2">
        <span className="text-sm font-bold text-foreground">Location</span>
        <div className="flex gap-2 flex-wrap">
          {validLocations.map((location) => {
            const isActive = selectedLocation === location.value;
            return (
              <Button
                key={location.value}
                variant="outline"
                size="sm"
                className={`border rounded-sm ${
                  isActive
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                }`}
                onClick={() => onLocationChange(location.value)}
              >
                {location.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
