"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface MetricItem {
  label: string;
  value: number | string | null | undefined;
  format?: 'currency' | 'number' | 'percentage' | 'text';
  decimals?: number; // Optional decimal places
}

interface AggregatedCostsSummaryProps {
  metrics: MetricItem[];
  title?: string; // Optional custom title (default: "Summary")
}

export function AggregatedCostsSummary({ metrics, title = "Summary" }: AggregatedCostsSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatValue = (item: MetricItem): string => {
    if (item.value === null || item.value === undefined) return '-';
    
    if (item.format === 'text' || typeof item.value === 'string') {
      return String(item.value);
    }

    const numValue = typeof item.value === 'number' ? item.value : parseFloat(String(item.value));
    
    if (isNaN(numValue)) return '-';

    switch (item.format) {
      case 'currency':
        return formatCurrency(numValue, item.decimals ?? 2);
      case 'percentage':
        const decimals = item.decimals ?? 1;
        return `${formatNumber(numValue, decimals, false)}%`;
      case 'number':
        return formatNumber(numValue, item.decimals ?? 0, false);
      default:
        return formatNumber(numValue, item.decimals ?? 2, false);
    }
  };

  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="mt-4 p-4 bg-muted/50 rounded-sm border border-black">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto hover:bg-transparent"
          >
            <h3 className="text-sm font-semibold">{title}</h3>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "transform rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-4">
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 min-w-[500px]">
              {metrics.map((metric, index) => (
                <div key={index} className="flex flex-col">
                  <span className="text-sm text-muted-foreground mb-1">{metric.label}</span>
                  <span className="text-base font-semibold">{formatValue(metric)}</span>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}


