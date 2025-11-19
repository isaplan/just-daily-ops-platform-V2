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

export default function RevenueAnalysisPage() {
  const viewModel = useRevenueBreakdownViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

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
          </div>
        )}
      </div>
    </div>
  );
}

