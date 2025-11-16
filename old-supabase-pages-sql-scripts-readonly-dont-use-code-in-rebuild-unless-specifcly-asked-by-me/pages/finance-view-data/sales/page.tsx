/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/view-data
 */

/**
 * Finance View Data Sales View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Loader2, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useViewDataSalesViewModel } from "@/viewmodels/finance/useViewDataSalesViewModel";

export default function SalesDataPage() {
  const {
    // State
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    dateFilter,
    setDateFilter,

    // Data
    data,
    isLoading,
    error,

    // Computed
    totalPages,
  } = useViewDataSalesViewModel();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{data?.totals?.totalRevenue?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totals?.totalTransactions || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: €{data?.totals?.avgTransactionValue?.toFixed(2) || "0.00"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{data?.totals?.totalCash?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.totals?.totalRevenue && data.totals.totalRevenue > 0
                ? `${((data.totals.totalCash / data.totals.totalRevenue) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Card Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{data?.totals?.totalCard?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {data?.totals?.totalRevenue && data.totals.totalRevenue > 0
                ? `${((data.totals.totalCard / data.totals.totalRevenue) * 100).toFixed(1)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Data (Aggregated Revenue)</CardTitle>
          <CardDescription>
            Daily aggregated revenue from Eitje - {data?.total || 0} total records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Label htmlFor="date-filter">Filter by Date (YYYY-MM)</Label>
              <Input
                id="date-filter"
                type="month"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>
            <div className="w-32">
              <Label htmlFor="rows-per-page">Rows per page</Label>
              <Input
                id="rows-per-page"
                type="number"
                min="10"
                max="100"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(parseInt(e.target.value) || 20)}
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 py-8 text-center">
              Error: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Environment ID</TableHead>
                      <TableHead className="text-right">Total Revenue (€)</TableHead>
                      <TableHead className="text-right">Revenue Excl VAT (€)</TableHead>
                      <TableHead className="text-right">Revenue Incl VAT (€)</TableHead>
                      <TableHead className="text-right">VAT Amount (€)</TableHead>
                      <TableHead className="text-right">Avg VAT Rate (%)</TableHead>
                      <TableHead className="text-right">Cash (€)</TableHead>
                      <TableHead className="text-right">Card (€)</TableHead>
                      <TableHead className="text-right">Digital (€)</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Avg Transaction (€)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.records?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.records?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {record.date ? format(new Date(record.date), "PPP") : "-"}
                          </TableCell>
                          <TableCell>{record.environment_id || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            €{record.total_revenue?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.total_revenue_excl_vat?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.total_revenue_incl_vat?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.total_vat_amount?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.avg_vat_rate?.toFixed(1) || "0.0"}%
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.total_cash_revenue?.toFixed(2) || "0.00"}
                            {record.cash_percentage && record.cash_percentage > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({record.cash_percentage.toFixed(1)}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.total_card_revenue?.toFixed(2) || "0.00"}
                            {record.card_percentage && record.card_percentage > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({record.card_percentage.toFixed(1)}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.total_digital_revenue?.toFixed(2) || "0.00"}
                            {record.digital_percentage && record.digital_percentage > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({record.digital_percentage.toFixed(1)}%)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.transaction_count || "0"}
                          </TableCell>
                          <TableCell className="text-right">
                            €{record.avg_revenue_per_transaction?.toFixed(2) || "0.00"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({data?.total || 0} total records)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || isLoading}
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
