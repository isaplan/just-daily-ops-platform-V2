"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SmartMonthFilterProps {
  selectedMonth: number | null;
  onMonthChange: (month: number | null) => void;
  monthCounts?: Record<number, number>; // Map of month (1-12) to count of items
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

export function SmartMonthFilter({ selectedMonth, onMonthChange, monthCounts = {} }: SmartMonthFilterProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-foreground">Month</span>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className={`border rounded-sm ${
            selectedMonth === null
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
          }`}
          onClick={() => onMonthChange(null)}
        >
          All Months
        </Button>
        {MONTHS.map((month) => {
          const isActive = selectedMonth === month.value;
          const count = monthCounts[month.value] || 0;
          
          return (
            <Button
              key={month.value}
              variant="outline"
              size="sm"
              className={`border rounded-sm relative ${
                isActive
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
              }`}
              onClick={() => onMonthChange(month.value)}
            >
              {month.label}
              {count > 0 && (
                <Badge 
                  variant="secondary" 
                  className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-blue-100 text-blue-700 border-blue-300"
                >
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}













