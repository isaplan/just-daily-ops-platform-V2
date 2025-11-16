/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/view-data
 */

/**
 * Finance View Data Labor Costs View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Loader2, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useViewDataLaborCostsViewModel } from "@/viewmodels/finance/useViewDataLaborCostsViewModel";

export default function LaborCostsPage() {
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
  } = useViewDataLaborCostsViewModel();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{data?.totals?.totalCost?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totals?.totalHours?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost/Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{data?.totals?.avgCostPerHour?.toFixed(2) || "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Labor Costs Data (Aggregated)</CardTitle>
          <CardDescription>
            Daily aggregated labor costs from Eitje - {data?.total || 0} total records
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
                      <TableHead>Team ID</TableHead>
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Total Wage Cost (€)</TableHead>
                      <TableHead className="text-right">Avg Wage/Hour (€)</TableHead>
                      <TableHead className="text-right">Employee Count</TableHead>
                      <TableHead className="text-right">Cost per Employee (€)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.records?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data?.records?.map((record) => {
                        const costPerEmployee =
                          record.employee_count && record.employee_count > 0
                            ? (record.total_wage_cost || 0) / record.employee_count
                            : 0;

                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {record.date ? format(new Date(record.date), "PPP") : "-"}
                            </TableCell>
                            <TableCell>{record.environment_id || "-"}</TableCell>
                            <TableCell>{record.team_id || "-"}</TableCell>
                            <TableCell className="text-right">
                              {record.total_hours_worked?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              €{record.total_wage_cost?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className="text-right">
                              €{record.avg_wage_per_hour?.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className="text-right">
                              {record.employee_count || "0"}
                            </TableCell>
                            <TableCell className="text-right">
                              €{costPerEmployee.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
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
