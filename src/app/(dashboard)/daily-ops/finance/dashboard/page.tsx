/**
 * Daily Ops Finance Dashboard View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import { Loader2 } from "lucide-react";
import { useFinanceDashboardViewModel } from "@/viewmodels/daily-ops/useFinanceDashboardViewModel";

export default function FinanceDashboardPage() {
  const {
    isLoading,
    error,
    revenueKpi,
    costOfSalesKpi,
    laborKpi,
    otherCostsKpi,
    resultaatKpi,
    formatCurrency,
    getMonthName,
    lastMonth,
    lastMonthYear,
  } = useFinanceDashboardViewModel();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <p className="text-muted-foreground">
          Last month vs 6-month average for all main COGS categories
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-500">
              Failed to load dashboard data
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Revenue - Netto-omzet groepen */}
          <RevenueKpiCard
            title="Netto-omzet groepen"
            value={revenueKpi?.lastMonth || 0}
            previousValue={revenueKpi?.sixMonthAverage || 0}
            comparisonLabel={`6-month avg: ${formatCurrency(revenueKpi?.sixMonthAverage || 0)}`}
            isLoading={isLoading}
          />

          {/* Cost of Sales - Kostprijs van de omzet */}
          <RevenueKpiCard
            title="Kostprijs van de omzet"
            value={costOfSalesKpi?.lastMonth || 0}
            previousValue={costOfSalesKpi?.sixMonthAverage || 0}
            comparisonLabel={`6-month avg: ${formatCurrency(costOfSalesKpi?.sixMonthAverage || 0)}`}
            isLoading={isLoading}
          />

          {/* Labor Costs - Arbeidskosten */}
          <RevenueKpiCard
            title="Arbeidskosten"
            value={laborKpi?.lastMonth || 0}
            previousValue={laborKpi?.sixMonthAverage || 0}
            comparisonLabel={`6-month avg: ${formatCurrency(laborKpi?.sixMonthAverage || 0)}`}
            isLoading={isLoading}
          />

          {/* Other Costs - Overige bedrijfskosten */}
          <RevenueKpiCard
            title="Overige bedrijfskosten"
            value={otherCostsKpi?.lastMonth || 0}
            previousValue={otherCostsKpi?.sixMonthAverage || 0}
            comparisonLabel={`6-month avg: ${formatCurrency(otherCostsKpi?.sixMonthAverage || 0)}`}
            isLoading={isLoading}
          />

          {/* Resultaat - Profit/Loss */}
          <RevenueKpiCard
            title="Resultaat"
            value={resultaatKpi?.lastMonth || 0}
            previousValue={resultaatKpi?.sixMonthAverage || 0}
            comparisonLabel={`6-month avg: ${formatCurrency(resultaatKpi?.sixMonthAverage || 0)}`}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Summary Card */}
      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Comparing {getMonthName(lastMonth)} {lastMonthYear} against the average of the last 6 months
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

