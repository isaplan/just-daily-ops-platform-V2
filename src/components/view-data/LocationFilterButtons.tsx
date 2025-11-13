"use client";

import { Button } from "@/components/ui/button";

interface LocationFilterButtonsProps {
  options: Array<{ value: string; label: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
  label?: string;
}

export function LocationFilterButtons({
  options,
  selectedValue,
  onValueChange,
  label = "Location",
}: LocationFilterButtonsProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-foreground">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map((option) => {
          const isActive = selectedValue === option.value;
          return (
            <Button
              key={option.value}
              variant="outline"
              size="sm"
              className={`border rounded-sm ${
                isActive
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
              }`}
              onClick={() => onValueChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

