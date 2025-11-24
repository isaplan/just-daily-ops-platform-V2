/**
 * Revenue Analysis Page
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { useRevenueBreakdownViewModel } from "@/viewmodels/sales/useRevenueBreakdownViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { formatCurrency } from "@/lib/utils";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";

export default function RevenueAnalysisPage() {
  const viewModel = useRevenueBreakdownViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Calculate totals from revenue data
  const revenueTotals = viewModel.revenueData ? (() => {
    const data = viewModel.revenueData;
    const totalRevenueExVat = data.reduce((sum, r) => sum + (r.total_revenue_ex_vat || 0), 0);
    const totalRevenueIncVat = data.reduce((sum, r) => sum + (r.total_revenue_inc_vat || 0), 0);
    const totalVat = data.reduce((sum, r) => sum + (r.total_vat || 0), 0);
    const totalTransactions = data.reduce((sum, r) => sum + (r.total_transactions || 0), 0);
    const avgTransactionValue = totalTransactions > 0 ? totalRevenueIncVat / totalTransactions : 0;
    const dailyAvg = data.length > 0 ? totalRevenueIncVat / data.length : 0;
    
    return {
      totalRevenueExVat,
      totalRevenueIncVat,
      totalVat,
      totalTransactions,
      avgTransactionValue,
      dailyAvg,
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

        {viewModel.isLoading && <LoadingState />}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading revenue data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.revenueData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.revenueData.length} day{viewModel.revenueData.length !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Revenue (ex VAT)</TableHead>
                  <TableHead className="text-right">Revenue (inc VAT)</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Avg Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.revenueData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No revenue data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.revenueData.map((record: any, index: number) => (
                    <TableRow key={`${record.date}_${record.location_id || 'unknown'}_${index}`}>
                      <TableCell className="font-medium">{formatDateDDMMYY(record.date)}</TableCell>
                      <TableCell>{record.location_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.total_revenue_ex_vat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.total_revenue_inc_vat)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.total_vat)}</TableCell>
                      <TableCell className="text-right">{record.total_transactions}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.average_transaction_value)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {/* Revenue Totals Summary */}
            {revenueTotals && (
              <AggregatedCostsSummary
                title="Summary"
                metrics={[
                  { label: "Total Revenue (Ex VAT)", value: revenueTotals.totalRevenueExVat, format: "currency" },
                  { label: "Total Revenue (Inc VAT)", value: revenueTotals.totalRevenueIncVat, format: "currency" },
                  { label: "Total VAT", value: revenueTotals.totalVat, format: "currency" },
                  { label: "Total Transactions", value: revenueTotals.totalTransactions, format: "number", decimals: 0 },
                  { label: "Avg Transaction Value", value: revenueTotals.avgTransactionValue, format: "currency" },
                  { label: "Daily Avg Revenue", value: revenueTotals.dailyAvg, format: "currency" },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

