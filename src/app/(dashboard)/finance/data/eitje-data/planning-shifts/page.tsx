/**
 * Finance Eitje Data Planning Shifts View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";
import { useEitjeDataPlanningShiftsViewModel } from "@/viewmodels/finance/useEitjeDataPlanningShiftsViewModel";

export default function PlanningShiftsPage() {
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
    showAllColumns,
    setShowAllColumns,

    // Data
    locationOptions,
    data,
    isLoading,
    error,

    // Computed
    totalPages,
  } = useEitjeDataPlanningShiftsViewModel();

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) return "-";
    return `€${Math.round(Number(value))}`; // No decimals
  };

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
              <div className="mt-16">
                <ShowMoreColumnsToggle
                  isExpanded={showAllColumns}
                  onToggle={setShowAllColumns}
                  coreColumnCount={8}
                  totalColumnCount={15}
                />
              </div>
              <div className="bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Environment</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Planned Hours</TableHead>
                      <TableHead className="font-semibold">Break Minutes</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
                      {showAllColumns && (
                        <>
                          <TableHead className="font-semibold">Eitje ID</TableHead>
                          <TableHead className="font-semibold">Start Time</TableHead>
                          <TableHead className="font-semibold">End Time</TableHead>
                          <TableHead className="font-semibold">Planned Cost</TableHead>
                          <TableHead className="font-semibold">Hourly Rate</TableHead>
                          <TableHead className="font-semibold">Shift Type</TableHead>
                          <TableHead className="font-semibold">Type Name</TableHead>
                          <TableHead className="font-semibold">Notes</TableHead>
                          <TableHead className="font-semibold">Remarks</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showAllColumns ? 15 : 8} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record) => {
                        // Calculate hourly rate if missing
                        const hourlyRate =
                          record.wage_cost && record.planned_hours && Number(record.planned_hours) > 0
                            ? Number(record.wage_cost) / Number(record.planned_hours)
                            : null;

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                            <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                            <TableCell>{record.user_name || record.user_id || "-"}</TableCell>
                            <TableCell>
                              {Number(record.planned_hours || record.hours || record.total_hours || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>{record.break_minutes_planned || record.break_minutes || 0}</TableCell>
                            <TableCell>{record.status || "-"}</TableCell>
                            <TableCell>
                              {record.updated_at ? formatDateDDMMYYTime(record.updated_at) : "-"}
                            </TableCell>
                            {showAllColumns && (
                              <>
                                <TableCell>{record.eitje_id || "-"}</TableCell>
                                <TableCell>
                                  {record.start_time ? formatDateDDMMYYTime(record.start_time) : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.end_time ? formatDateDDMMYYTime(record.end_time) : "-"}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {formatCurrency(record.planned_cost)}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  {hourlyRate && Number(hourlyRate) > 0 ? formatCurrency(hourlyRate) : "-"}
                                </TableCell>
                                <TableCell>{record.shift_type || "-"}</TableCell>
                                <TableCell>{record.type_name || "-"}</TableCell>
                                <TableCell className="max-w-xs truncate">{record.notes || "-"}</TableCell>
                                <TableCell className="max-w-xs truncate">{record.remarks || "-"}</TableCell>
                              </>
                            )}
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
