/**
 * Sales Bork View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { useSalesBorkViewModel } from "@/viewmodels/data/useSalesBorkViewModel";

export default function SalesBorkPage() {
  const {
    selectedYear,
    handleYearChange,
    selectedMonth,
    handleMonthChange,
    selectedDay,
    handleDayChange,
    selectedLocation,
    handleLocationChange,
    selectedDatePreset,
    handleDatePresetChange,
    currentPage,
    handlePreviousPage,
    handleNextPage,
    totalPages,
    locations,
    data,
    totalRecords,
    isLoading,
    error,
    handleResetToDefault,
  } = useSalesBorkViewModel();

  return (
    <div className="container mx-auto py-6 space-y-6 min-w-0">
      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        selectedDay={selectedDay}
        onDayChange={handleDayChange}
        selectedLocation={selectedLocation}
        onLocationChange={handleLocationChange}
        selectedDatePreset={selectedDatePreset}
        onDatePresetChange={handleDatePresetChange}
        locations={locations}
        onResetToDefault={handleResetToDefault}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading data: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              <div className="mt-16 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Total Revenue</TableHead>
                      <TableHead className="font-semibold">Transaction Count</TableHead>
                      <TableHead className="font-semibold">Avg Revenue/Transaction</TableHead>
                      <TableHead className="font-semibold">Revenue Excl VAT</TableHead>
                      <TableHead className="font-semibold">Revenue Incl VAT</TableHead>
                      <TableHead className="font-semibold">VAT Amount</TableHead>
                      <TableHead className="font-semibold">Avg VAT Rate</TableHead>
                      <TableHead className="font-semibold">Cash Revenue</TableHead>
                      <TableHead className="font-semibold">Card Revenue</TableHead>
                      <TableHead className="font-semibold">Digital Revenue</TableHead>
                      <TableHead className="font-semibold">Other Revenue</TableHead>
                      <TableHead className="font-semibold">Cash %</TableHead>
                      <TableHead className="font-semibold">Card %</TableHead>
                      <TableHead className="font-semibold">Digital %</TableHead>
                      <TableHead className="font-semibold">Other %</TableHead>
                      <TableHead className="font-semibold">Max Transaction</TableHead>
                      <TableHead className="font-semibold">Min Transaction</TableHead>
                      <TableHead className="font-semibold">Currency</TableHead>
                      <TableHead className="font-semibold">Net Revenue</TableHead>
                      <TableHead className="font-semibold">Gross Revenue</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={23} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((record: any) => {
                        const formatCurrency = (value: any) => {
                          if (value === null || value === undefined || value === "-" || value === 0) return "-";
                          return `€${Math.round(Number(value))}`;
                        };

                        const formatPercentage = (value: any) => {
                          if (value === null || value === undefined || value === "-" || value === 0) return "-";
                          return `${Number(value).toFixed(2)}%`;
                        };

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(record.total_revenue)}</TableCell>
                            <TableCell>{record.transaction_count ?? "-"}</TableCell>
                            <TableCell>{formatCurrency(record.avg_revenue_per_transaction)}</TableCell>
                            <TableCell>{formatCurrency(record.total_revenue_excl_vat)}</TableCell>
                            <TableCell>{formatCurrency(record.total_revenue_incl_vat)}</TableCell>
                            <TableCell>{formatCurrency(record.total_vat_amount)}</TableCell>
                            <TableCell>{formatPercentage(record.avg_vat_rate)}</TableCell>
                            <TableCell>{formatCurrency(record.total_cash_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.total_card_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.total_digital_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.total_other_revenue)}</TableCell>
                            <TableCell>{formatPercentage(record.cash_percentage)}</TableCell>
                            <TableCell>{formatPercentage(record.card_percentage)}</TableCell>
                            <TableCell>{formatPercentage(record.digital_percentage)}</TableCell>
                            <TableCell>{formatPercentage(record.other_percentage)}</TableCell>
                            <TableCell>{formatCurrency(record.max_transaction_value)}</TableCell>
                            <TableCell>{formatCurrency(record.min_transaction_value)}</TableCell>
                            <TableCell>{record.currency || "EUR"}</TableCell>
                            <TableCell>{formatCurrency(record.net_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.gross_revenue)}</TableCell>
                            <TableCell>{formatDateDDMMYYTime(record.updated_at)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

