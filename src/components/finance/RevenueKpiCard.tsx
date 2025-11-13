"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueKpiCardProps {
  title: string;
  value: number;
  previousValue: number;
  comparisonLabel: string;
  currency?: string;
  isLoading?: boolean;
}

export function RevenueKpiCard({
  title,
  value,
  previousValue,
  comparisonLabel,
  currency = "€",
  isLoading = false,
}: RevenueKpiCardProps) {
  const difference = value - previousValue;
  const percentageChange = previousValue > 0 ? ((difference / previousValue) * 100) : 0;
  
  const isPositive = difference > 0;
  const isNeutral = difference === 0;

  // Format large numbers with abbreviations (€1.23M, €45.6K)
  const formatAbbreviatedCurrency = (val: number): string => {
    const absValue = Math.abs(val);
    
    if (absValue >= 1_000_000) {
      return `${currency}${(val / 1_000_000).toFixed(2)}M`;
    } else if (absValue >= 1_000) {
      return `${currency}${(val / 1_000).toFixed(1)}K`;
    } else {
      return `${currency}${val.toFixed(0)}`;
    }
  };

  return (
    <Card className="aspect-square flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium leading-tight">{title}</CardTitle>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : isNeutral ? (
          <Minus className="h-4 w-4 text-muted-foreground" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
        {isLoading ? (
          <div className="space-y-2 w-full">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-6 bg-muted animate-pulse rounded w-3/4 mx-auto" />
          </div>
        ) : (
          <>
            <div className="text-3xl font-bold mb-2">
              {formatAbbreviatedCurrency(value)}
            </div>
            {comparisonLabel && (
              <div className="text-sm text-muted-foreground">
                <span
                  className={cn(
                    "font-semibold text-base",
                    isPositive && "text-green-500",
                    isNeutral && "text-muted-foreground",
                    !isPositive && !isNeutral && "text-red-500"
                  )}
                >
                  {isPositive ? "+" : ""}{percentageChange.toFixed(1)}%
                </span>
                <div className="mt-1">vs {comparisonLabel}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}