/**
 * Waiter Performance Page
 * Shows sales performance metrics per waiter
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { useWaiterPerformanceViewModel } from "@/viewmodels/sales/useWaiterPerformanceViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function WaiterPerformancePage() {
  const viewModel = useWaiterPerformanceViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

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
        {/* Filters */}
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
                      <TableCell className="font-medium">{waiter.waiter_name || '-'}</TableCell>
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
          </div>
        )}
      </div>
    </div>
  );
}

