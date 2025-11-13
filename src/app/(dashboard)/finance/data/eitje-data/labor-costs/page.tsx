/**
 * Finance Eitje Data Labor Costs View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { useEitjeDataLaborCostsViewModel } from "@/viewmodels/finance/useEitjeDataLaborCostsViewModel";
import type { LaborCostRecord } from "@/models/finance/eitje-data-labor-costs.model";

// Memoized table row for performance
const LaborCostRow = memo(({ record }: { record: LaborCostRecord }) => {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) return "-";
    return `€${Math.round(Number(value))}`; // No decimals
  };

  // Calculate avg_wage_per_hour if missing but we have the data
  const avgWage =
    record.avg_wage_per_hour && Number(record.avg_wage_per_hour) > 0
    ? record.avg_wage_per_hour
      : record.total_wage_cost &&
          record.total_hours_worked &&
          Number(record.total_hours_worked) > 0
      ? Number(record.total_wage_cost) / Number(record.total_hours_worked)
      : 0;

  return (
    <TableRow>
      <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
      <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
      <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
      <TableCell className="font-semibold">{formatCurrency(record.total_wage_cost)}</TableCell>
      <TableCell>{Number(record.total_hours_worked || 0).toFixed(2)}</TableCell>
      <TableCell>{record.total_breaks_minutes || 0}</TableCell>
      <TableCell>{record.employee_count || 0}</TableCell>
      <TableCell>{record.shift_count || 0}</TableCell>
      <TableCell>{Number(record.avg_hours_per_employee || 0).toFixed(2)}</TableCell>
      <TableCell className="font-semibold">
        {avgWage && Number(avgWage) > 0 ? formatCurrency(avgWage) : "-"}
      </TableCell>
      <TableCell>
        {record.updated_at ? formatDateDDMMYYTime(record.updated_at) : "-"}
      </TableCell>
    </TableRow>
  );
});

LaborCostRow.displayName = "LaborCostRow";

export default function LaborCostsPage() {
  const {
    // State
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    selectedDay,
    setSelectedDay,
    selectedLocation,
    setSelectedLocation,
    selectedDatePreset,
    setSelectedDatePreset,
    currentPage,
    setCurrentPage,

    // Data
    locationOptions,
    data,
    isLoading,
    error,

    // Computed
    totalPages,
  } = useEitjeDataLaborCostsViewModel();

  return (
    <div className="space-y-6">
      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedDay={selectedDay}
        onDayChange={setSelectedDay}
        selectedLocation={selectedLocation}
        onLocationChange={setSelectedLocation}
        selectedDatePreset={selectedDatePreset}
        onDatePresetChange={setSelectedDatePreset}
        locations={locationOptions}
        onResetToDefault={() => {
          setSelectedYear(2025);
          setSelectedMonth(null);
          setSelectedDay(null);
          setSelectedLocation("all");
          setSelectedDatePreset("this-month");
          setCurrentPage(1);
        }}
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
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Labor Cost</TableHead>
                      <TableHead className="font-semibold">Total Hours Worked</TableHead>
                      <TableHead className="font-semibold">Total Breaks (min)</TableHead>
                      <TableHead className="font-semibold">Employee Count</TableHead>
                      <TableHead className="font-semibold">Shift Count</TableHead>
                      <TableHead className="font-semibold">Avg Hours/Employee</TableHead>
                      <TableHead className="font-semibold">Avg Wage/Hour</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record) => <LaborCostRow key={record.id} record={record} />)
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
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
