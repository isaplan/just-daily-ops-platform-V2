/**
 * Payment Methods - Client Component
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
import { usePaymentMethodStatsViewModel } from "@/viewmodels/sales/usePaymentMethodStatsViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";

interface PaymentMethodsClientProps {
  initialData?: {
    paymentData?: any;
    locations?: any[];
  };
}

export function PaymentMethodsClient({ initialData }: PaymentMethodsClientProps) {
  const viewModel = usePaymentMethodStatsViewModel(initialData);
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

  // Calculate totals from payment data
  const paymentTotals = viewModel.paymentData ? (() => {
    const data = viewModel.paymentData;
    const totalMethods = data.length;
    const totalAmount = data.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
    const totalTransactions = data.reduce((sum, p) => sum + (p.total_transactions || 0), 0);
    const topMethod = data.length > 0 ? data.reduce((max, p) => 
      (p.total_revenue || 0) > (max.total_revenue || 0) ? p : max
    ) : null;
    
    return {
      totalMethods,
      totalAmount,
      totalTransactions,
      topMethod: topMethod?.payment_method || '-',
    };
  })() : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
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

        {viewModel.isLoading && <LoadingState />}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading payment method data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.paymentData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.paymentData.length} payment method{viewModel.paymentData.length !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Avg Transaction</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.paymentData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No payment method data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.paymentData.map((payment: any, index: number) => (
                    <TableRow key={`${payment.payment_method}_${payment.location_id || 'unknown'}_${index}`}>
                      <TableCell className="font-medium">{payment.payment_method || 'Unknown'}</TableCell>
                      <TableCell>{payment.location_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.total_revenue)}</TableCell>
                      <TableCell className="text-right">{payment.total_transactions}</TableCell>
                      <TableCell className="text-right">{formatCurrency(payment.average_transaction_value)}</TableCell>
                      <TableCell className="text-right">{formatNumber(payment.percentage_of_total, 1)}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {/* Payment Totals Summary */}
            {paymentTotals && (
              <AggregatedCostsSummary
                title="Summary"
                startDate={viewModel.startDate}
                endDate={viewModel.endDate}
                metrics={[
                  { label: "Total Payment Methods", value: paymentTotals.totalMethods, format: "number", decimals: 0 },
                  { label: "Total Amount", value: paymentTotals.totalAmount, format: "currency" },
                  { label: "Total Transactions", value: paymentTotals.totalTransactions, format: "number", decimals: 0 },
                  { label: "Top Method", value: paymentTotals.topMethod, format: "text" },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

