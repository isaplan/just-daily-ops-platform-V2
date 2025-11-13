/**
 * Finance Eitje Data Imported View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { useEitjeDataImportedViewModel } from "@/viewmodels/finance/useEitjeDataImportedViewModel";

export default function DataImportedPage() {
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

    // Handlers
    handleResetToDefault,
  } = useEitjeDataImportedViewModel();

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return timeStr;
    }
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
        onResetToDefault={handleResetToDefault}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Imported Raw Data</CardTitle>
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} raw records from time registration shifts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-destructive font-semibold mb-2">
                {error instanceof Error ? error.message : "Unknown error"}
              </div>
              {error instanceof Error && error.message.includes("Network connection") && (
                <div className="text-sm text-muted-foreground mt-2">
                  The query will automatically retry. If the problem persists, please check your internet connection.
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {/* Debug info - remove after fixing */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-4 p-2 bg-muted text-xs rounded">
                  <strong>Debug:</strong> Data loaded - Records: {data?.records?.length || 0}, Total: {data?.total || 0}
                  {data?.records?.[0] && (
                    <div className="mt-1">
                      First record keys: {Object.keys(data.records[0]).join(", ")}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-16 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Start Time</TableHead>
                      <TableHead className="font-semibold">End Time</TableHead>
                      <TableHead className="font-semibold">Hours Worked</TableHead>
                      <TableHead className="font-semibold">Break Minutes</TableHead>
                      <TableHead className="font-semibold">Wage Cost</TableHead>
                      <TableHead className="font-semibold">Shift Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data.records || data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                          {/* User: Show name if available, otherwise show ID from raw_data */}
                          <TableCell>
                            {record.user_name || (record.user_id ? `User ${record.user_id}` : "-")}
                          </TableCell>
                          {/* Team: Show name if available, otherwise show ID from raw_data */}
                          <TableCell>
                            {record.team_name || (record.team_id ? `Team ${record.team_id}` : "-")}
                          </TableCell>
                          {/* Location: Show name if available, otherwise show ID from raw_data */}
                          <TableCell>
                            {record.environment_name || (record.environment_id ? `Loc ${record.environment_id}` : "-")}
                          </TableCell>
                          {/* Start Time: Use mapped value from raw_data */}
                          <TableCell>{formatTime(record.start_time || record.start_datetime || null)}</TableCell>
                          {/* End Time: Use mapped value from raw_data */}
                          <TableCell>{formatTime(record.end_time || record.end_datetime || null)}</TableCell>
                          {/* Hours Worked: Use mapped value from raw_data */}
                          <TableCell>{Number(record.hours_worked || 0).toFixed(2)}</TableCell>
                          {/* Break Minutes: Use mapped value from raw_data */}
                          <TableCell>{record.break_minutes || 0}</TableCell>
                          {/* Wage Cost: Use mapped value from raw_data */}
                          <TableCell className="font-semibold">
                            {record.wage_cost && Number(record.wage_cost) > 0
                              ? `€${Math.round(Number(record.wage_cost))}`
                              : "-"}
                          </TableCell>
                          {/* Shift Type: Already converted to primitive in mapping */}
                          <TableCell>{record.shift_type || "-"}</TableCell>
                          {/* Status: Already converted to primitive in mapping */}
                          <TableCell>{record.status || "-"}</TableCell>
                          <TableCell>
                            {record.created_at ? formatDateDDMMYYTime(record.created_at) : "-"}
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
