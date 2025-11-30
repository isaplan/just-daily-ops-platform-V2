/**
 * Waiter Performance - Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import { usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { AutoFilterRegistry } from "@/components/navigation/auto-filter-registry";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { useWaiterPerformanceViewModel } from "@/viewmodels/sales/useWaiterPerformanceViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";
import { ClickableWorkerName } from "@/components/workforce/ClickableWorkerName";

interface WaiterPerformanceClientProps {
  initialData?: {
    waiterData?: any;
    locations?: any[];
  };
}

export function WaiterPerformanceClient({ initialData }: WaiterPerformanceClientProps) {
  const viewModel = useWaiterPerformanceViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Auto-generate filter labels from viewModel state
  const filterLabels = useMemo(() => [
    { key: "year", label: "Year", value: viewModel.selectedYear },
    { key: "month", label: "Month", value: viewModel.selectedMonth },
    { key: "day", label: "Day", value: viewModel.selectedDay },
    { key: "location", label: "Location", value: viewModel.selectedLocation !== "all" ? viewModel.selectedLocation : null },
  ], [
    viewModel.selectedYear,
    viewModel.selectedMonth,
    viewModel.selectedDay,
    viewModel.selectedLocation,
  ]);

  // Filter change handlers - memoized with useCallback for stable reference
  const handleFilterChange = useCallback((key: string, value: any) => {
    switch (key) {
      case "year": viewModel.setSelectedYear(value); break;
      case "month": viewModel.setSelectedMonth(value); break;
      case "day": viewModel.setSelectedDay(value); break;
      case "location": viewModel.setSelectedLocation(value); break;
    }
  }, [
    viewModel.setSelectedYear,
    viewModel.setSelectedMonth,
    viewModel.setSelectedDay,
    viewModel.setSelectedLocation,
  ]);

  // Filter remove handlers - memoized with useCallback for stable reference
  const handleFilterRemove = useCallback((key: string) => {
    switch (key) {
      case "year": viewModel.setSelectedYear(new Date().getFullYear()); break;
      case "month": viewModel.setSelectedMonth(null); break;
      case "day": viewModel.setSelectedDay(null); break;
      case "location": viewModel.setSelectedLocation("all"); break;
    }
  }, [
    viewModel.setSelectedYear,
    viewModel.setSelectedMonth,
    viewModel.setSelectedDay,
    viewModel.setSelectedLocation,
  ]);

  // Calculate totals from waiter data
  const waiterTotals = viewModel.waiterData ? (() => {
    const data = viewModel.waiterData;
    const totalWaiters = data.length;
    const totalSales = data.reduce((sum, w) => sum + (w.total_revenue || 0), 0);
    const totalTransactions = data.reduce((sum, w) => sum + (w.total_transactions || 0), 0);
    const totalItems = data.reduce((sum, w) => sum + (w.total_items_sold || 0), 0);
    const avgSalesPerWaiter = totalWaiters > 0 ? totalSales / totalWaiters : 0;
    
    return {
      totalWaiters,
      totalSales,
      totalTransactions,
      totalItems,
      avgSalesPerWaiter,
    };
  })() : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Auto-registered Filters - Will show in Sheet/Drawer, hidden in page */}
        <AutoFilterRegistry
          filters={{
            labels: filterLabels,
            onFilterChange: handleFilterChange,
            onFilterRemove: handleFilterRemove,
          }}
        >
          <EitjeDataFilters
            selectedYear={viewModel.selectedYear}
            selectedMonth={viewModel.selectedMonth}
            selectedDay={viewModel.selectedDay}
            selectedLocation={viewModel.selectedLocation}
            selectedDatePreset={viewModel.selectedDatePreset}
            onYearChange={viewModel.setSelectedYear}
            onMonthChange={viewModel.setSelectedMonth}
            onDayChange={viewModel.setSelectedDay}
            onLocationChange={viewModel.setSelectedLocation}
            onDatePresetChange={viewModel.setSelectedDatePreset}
            locations={viewModel.locationOptions}
            disabled={!viewModel.isCurrentYear}
          />
        </AutoFilterRegistry>

        {/* Waiter Performance Table */}
        {viewModel.isLoading && <LoadingState />}

        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading waiter performance data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.waiterData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.waiterData.length} waiter{viewModel.waiterData.length !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Waiter</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Items Sold</TableHead>
                  <TableHead className="text-right">Avg Ticket Value</TableHead>
                  <TableHead className="text-right">Avg Items/Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.waiterData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No waiter data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.waiterData.map((waiter: any, index: number) => (
                    <TableRow key={`${waiter.waiter_name}_${waiter.location_id || 'unknown'}_${index}`}>
                      <TableCell>
                        {waiter.waiter_name ? (
                          <ClickableWorkerName 
                            worker={{
                              user_name: waiter.waiter_name,
                            }}
                          />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{waiter.location_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(waiter.total_revenue)}
                      </TableCell>
                      <TableCell className="text-right">{waiter.total_transactions}</TableCell>
                      <TableCell className="text-right">{formatNumber(waiter.total_items_sold, 1)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(waiter.average_ticket_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(waiter.average_items_per_transaction, 1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {/* Waiter Totals Summary */}
            {waiterTotals && (
              <AggregatedCostsSummary
                title="Summary"
                startDate={viewModel.startDate}
                endDate={viewModel.endDate}
                metrics={[
                  { label: "Total Waiters", value: waiterTotals.totalWaiters, format: "number", decimals: 0 },
                  { label: "Total Sales", value: waiterTotals.totalSales, format: "currency" },
                  { label: "Total Transactions", value: waiterTotals.totalTransactions, format: "number", decimals: 0 },
                  { label: "Total Items", value: waiterTotals.totalItems, format: "number", decimals: 0 },
                  { label: "Avg Sales per Waiter", value: waiterTotals.avgSalesPerWaiter, format: "currency" },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

