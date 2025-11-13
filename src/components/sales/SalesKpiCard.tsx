"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SalesKpiCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: "currency" | "number" | "percentage";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function SalesKpiCard({ 
  title, 
  value, 
  previousValue, 
  format = "currency", 
  isLoading = false,
  icon 
}: SalesKpiCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("nl-NL", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      case "number":
        return new Intl.NumberFormat("nl-NL").format(val);
      default:
        return val.toString();
    }
  };

  const calculateChange = () => {
    if (previousValue === undefined || previousValue === 0) return null;
    return ((value - previousValue) / previousValue) * 100;
  };

  const change = calculateChange();
  const isPositive = change !== null && change > 0;
  const isNegative = change !== null && change < 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== null && (
          <div className="flex items-center text-xs text-muted-foreground">
            {isPositive && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 mr-1 text-red-500" />}
            {change === 0 && <Minus className="h-3 w-3 mr-1 text-gray-500" />}
            <span className={isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-gray-500"}>
              {change > 0 ? "+" : ""}{change.toFixed(1)}% from previous period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

