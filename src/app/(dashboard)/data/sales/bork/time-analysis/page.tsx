/**
 * Time-Based Analysis Page
 * Shows sales patterns by hour of day
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { useTimeBasedAnalysisViewModel } from "@/viewmodels/sales/useTimeBasedAnalysisViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";

export default function TimeBasedAnalysisPage() {
  const viewModel = useTimeBasedAnalysisViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Calculate totals from time data
  const timeTotals = viewModel.timeData ? (() => {
    const data = viewModel.timeData;
    const totalRevenue = data.reduce((sum, t) => sum + (t.total_revenue || 0), 0);
    const totalTransactions = data.reduce((sum, t) => sum + (t.total_transactions || 0), 0);
    const peakHour = data.length > 0 ? data.reduce((max, t) => 
      (t.total_revenue || 0) > (max.total_revenue || 0) ? t : max
    ) : null;
    const avgHourlyRevenue = data.length > 0 ? totalRevenue / data.length : 0;
    
    return {
      totalRevenue,
      totalTransactions,
      peakHour: peakHour ? `${peakHour.hour}:00` : '-',
      peakRevenue: peakHour?.total_revenue || 0,
      avgHourlyRevenue,
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
          <ErrorState error={viewModel.error} message="Error loading time-based analysis" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.timeData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.timeData.length} hour{viewModel.timeData.length !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Hour</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Items Sold</TableHead>
                  <TableHead className="text-right">Avg Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.timeData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No time-based data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.timeData.map((record: any, index: number) => (
                    <TableRow key={`${record.hour}_${record.location_id || 'unknown'}_${index}`}>
                      <TableCell className="font-medium">{record.hour}:00</TableCell>
                      <TableCell>{record.location_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.total_revenue)}</TableCell>
                      <TableCell className="text-right">{record.total_transactions}</TableCell>
                      <TableCell className="text-right">{formatNumber(record.total_items_sold, 1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(record.average_transaction_value)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {/* Time-Based Totals Summary */}
            {timeTotals && (
              <AggregatedCostsSummary
                title="Summary"
                metrics={[
                  { label: "Total Revenue", value: timeTotals.totalRevenue, format: "currency" },
                  { label: "Total Transactions", value: timeTotals.totalTransactions, format: "number", decimals: 0 },
                  { label: "Peak Hour", value: timeTotals.peakHour, format: "text" },
                  { label: "Peak Revenue", value: timeTotals.peakRevenue, format: "currency" },
                  { label: "Avg Hourly Revenue", value: timeTotals.avgHourlyRevenue, format: "currency" },
                ]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

