"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesIntelligenceCardProps {
  title: string;
  data: Array<{
    productName: string;
    quantity: number;
    revenue: number;
    category?: string;
  }>;
  isLoading?: boolean;
}

export function SalesIntelligenceCard({ title, data, isLoading }: SalesIntelligenceCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.productName}</p>
                {item.category && (
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{formatCurrency(item.revenue)}</p>
                <p className="text-xs text-muted-foreground">{item.quantity} units</p>
              </div>
            </div>
          ))}
          {data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No data available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}