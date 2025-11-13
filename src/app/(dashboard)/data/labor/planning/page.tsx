/**
 * Labor Planning View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { useLaborPlanningViewModel } from "@/viewmodels/data/useLaborPlanningViewModel";
import { PlanningRecord } from "@/models/data/labor-planning.model";

export default function DataLaborPlanningPage() {
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
  } = useLaborPlanningViewModel();

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
        <CardHeader>
          <CardTitle>Planning Data Table</CardTitle>
          <CardDescription>
            Showing {data.length || 0} of {totalRecords || 0} records
          </CardDescription>
        </CardHeader>
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
              <div className="mt-16 bg-white rounded-sm border border-black px-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Eitje ID</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Worker</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Start Time</TableHead>
                      <TableHead className="font-semibold">End Time</TableHead>
                      <TableHead className="font-semibold">Planned Hours</TableHead>
                      <TableHead className="font-semibold">Breaks (min)</TableHead>
                      <TableHead className="font-semibold">Planned Cost</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Shift Type</TableHead>
                      <TableHead className="font-semibold">Skill Set</TableHead>
                      <TableHead className="font-semibold">Notes</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.map((record: PlanningRecord) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.eitje_id || "-"}</TableCell>
                          <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                          <TableCell>{record.user_name || `${record.user_first_name || ''} ${record.user_last_name || ''}`.trim() || `User ${record.user_id}`}</TableCell>
                          <TableCell>{record.environment_name || `Location ${record.environment_id}`}</TableCell>
                          <TableCell>{record.team_name || (record.team_id ? `Team ${record.team_id}` : "-")}</TableCell>
                          <TableCell>
                            {record.start_time ? formatDateDDMMYYTime(record.start_time) : 
                             record.start_datetime ? formatDateDDMMYYTime(record.start_datetime) :
                             record["start"] ? formatDateDDMMYYTime(record["start"]) : "-"}
                          </TableCell>
                          <TableCell>
                            {record.end_time ? formatDateDDMMYYTime(record.end_time) : 
                             record.end_datetime ? formatDateDDMMYYTime(record.end_datetime) :
                             record["end"] ? formatDateDDMMYYTime(record["end"]) : "-"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {Number(record.planned_hours || record.hours_planned || record.hours || record.total_hours || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>{record.break_minutes || record.breaks || record.break_minutes_planned || 0}</TableCell>
                          <TableCell>
                            {record.planned_cost || record.wage_cost ? `€${Math.round(Number(record.planned_cost || record.wage_cost))}` : "-"}
                          </TableCell>
                          <TableCell>
                            {record.confirmed ? "Confirmed" : record.cancelled ? "Cancelled" : record.status || "Planned"}
                          </TableCell>
                          <TableCell>{record.shift_type || "-"}</TableCell>
                          <TableCell>{record.skill_set || "-"}</TableCell>
                          <TableCell>{record.notes || record.remarks || "-"}</TableCell>
                          <TableCell>{formatDateDDMMYYTime(record.created_at)}</TableCell>
                        </TableRow>
                      ))
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
