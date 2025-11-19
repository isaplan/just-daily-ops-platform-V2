/**
 * Transaction Analysis Page
 * Shows transaction-level analysis
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { useTransactionAnalysisViewModel } from "@/viewmodels/sales/useTransactionAnalysisViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { formatCurrency, formatNumber } from "@/lib/utils";

function formatTimeString(time: string | null | undefined): string {
  if (!time) return "-";
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const utcHours = parseInt(match[1], 10);
    const minutes = match[2];
    const amsterdamHours = (utcHours + 1) % 24;
    const hours = String(amsterdamHours).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return time;
}

export default function TransactionAnalysisPage() {
  const viewModel = useTransactionAnalysisViewModel();
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
          <ErrorState error={viewModel.error} message="Error loading transaction analysis" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.transactionData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.transactionData.length} of {viewModel.total} transaction{viewModel.total !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Waiter</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.transactionData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No transaction data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.transactionData.map((transaction: any, index: number) => (
                    <TableRow key={`${transaction.ticket_number}_${transaction.date}_${index}`}>
                      <TableCell className="font-medium">{transaction.ticket_number}</TableCell>
                      <TableCell>{formatDateDDMMYY(transaction.date)}</TableCell>
                      <TableCell>{formatTimeString(transaction.time)}</TableCell>
                      <TableCell>{transaction.location_name || '-'}</TableCell>
                      <TableCell>{transaction.table_number || '-'}</TableCell>
                      <TableCell>{transaction.waiter_name || '-'}</TableCell>
                      <TableCell>{transaction.payment_method || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.total_revenue)}</TableCell>
                      <TableCell className="text-right">{transaction.item_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {viewModel.totalPages > 1 && (
              <SimplePagination
                currentPage={viewModel.currentPage}
                totalPages={viewModel.totalPages}
                onPageChange={viewModel.setCurrentPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

