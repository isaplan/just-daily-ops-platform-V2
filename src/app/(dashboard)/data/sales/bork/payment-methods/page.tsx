/**
 * Payment Methods Page
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { usePaymentMethodStatsViewModel } from "@/viewmodels/sales/usePaymentMethodStatsViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function PaymentMethodsPage() {
  const viewModel = usePaymentMethodStatsViewModel();
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
          </div>
        )}
      </div>
    </div>
  );
}

