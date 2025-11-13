/**
 * Hours V2 View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { useHoursV2ViewModel } from "@/viewmodels/eitje-v2/useHoursV2ViewModel";
import { ProcessedHoursRecord, AggregatedHoursRecord } from "@/models/eitje-v2/hours-v2.model";

export default function HoursV2Page() {
  const viewModel = useHoursV2ViewModel();

  return (
    <div className="space-y-6">
      {/* Filters */}
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
      />

      {/* Team and Shift Type Filters */}
      <div className="flex gap-6 flex-wrap">
        <LocationFilterButtons
          options={viewModel.teamOptions}
          selectedValue={viewModel.selectedTeam}
          onValueChange={viewModel.setSelectedTeam}
          label="Team"
        />
        <LocationFilterButtons
          options={viewModel.shiftTypeOptions}
          selectedValue={viewModel.selectedShiftType}
          onValueChange={viewModel.setSelectedShiftType}
          label="Shift Type"
        />
      </div>

      {/* Tabs */}
      <Tabs value={viewModel.activeTab} onValueChange={(value) => viewModel.setActiveTab(value as "processed" | "aggregated")}>
        <TabsList>
          <TabsTrigger value="processed">Processed Hours</TabsTrigger>
          <TabsTrigger value="aggregated">Aggregated Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="processed" className="space-y-4 mt-4">
          {viewModel.isLoadingProcessed && <LoadingState />}

          {viewModel.processedError && (
            <ErrorState error={viewModel.processedError} message="Error loading processed hours" />
          )}

          {!viewModel.isLoadingProcessed && !viewModel.processedError && viewModel.processedData && viewModel.processedData.records && (
            <>
              <div className="mt-4">
                <ShowMoreColumnsToggle
                  isExpanded={viewModel.showAllColumns}
                  onToggle={viewModel.setShowAllColumns}
                  coreColumnCount={8}
                  totalColumnCount={15}
                />
              </div>
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Team</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Start Time</TableHead>
                    <TableHead className="font-semibold">End Time</TableHead>
                    <TableHead className="font-semibold">Break Minutes</TableHead>
                    <TableHead className="font-semibold">Updated At</TableHead>
                    {viewModel.showAllColumns && (
                      <>
                        <TableHead className="font-semibold">Eitje ID</TableHead>
                        <TableHead className="font-semibold">Shift Type</TableHead>
                        <TableHead className="font-semibold">Type Name</TableHead>
                        <TableHead className="font-semibold">Remarks</TableHead>
                        <TableHead className="font-semibold">Approved</TableHead>
                        <TableHead className="font-semibold">Planning Shift ID</TableHead>
                        <TableHead className="font-semibold">Exported to HR</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewModel.processedData.records && viewModel.processedData.records.length > 0 ? (
                    viewModel.processedData.records.map((record: ProcessedHoursRecord) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                        <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                        <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                        <TableCell>{record.user_name || record.user_id || "-"}</TableCell>
                        <TableCell>{record.start ? formatDateDDMMYYTime(record.start) : "-"}</TableCell>
                        <TableCell>{record.end ? formatDateDDMMYYTime(record.end) : "-"}</TableCell>
                        <TableCell>{record.break_minutes || 0}</TableCell>
                        <TableCell>{record.updated_at ? formatDateDDMMYYTime(record.updated_at) : "-"}</TableCell>
                        {viewModel.showAllColumns && (
                          <>
                            <TableCell>{record.eitje_id || "-"}</TableCell>
                            <TableCell>{record.shift_type || "-"}</TableCell>
                            <TableCell>{record.type_name || "-"}</TableCell>
                            <TableCell>{record.remarks || "-"}</TableCell>
                            <TableCell>{record.approved ? "Yes" : "No"}</TableCell>
                            <TableCell>{record.planning_shift_id || "-"}</TableCell>
                            <TableCell>{record.exported_to_hr_integration ? "Yes" : "No"}</TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={viewModel.showAllColumns ? 15 : 8} className="text-center py-8 text-muted-foreground">
                        No processed hours data found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </UITable>

              {/* Pagination */}
              <SimplePagination
                currentPage={viewModel.currentPage}
                totalPages={viewModel.totalPages}
                totalRecords={viewModel.processedData?.total || 0}
                onPageChange={viewModel.setCurrentPage}
                isLoading={viewModel.isLoadingProcessed}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="aggregated" className="space-y-4 mt-4">
          {viewModel.isLoadingAggregated && <LoadingState />}

          {viewModel.aggregatedError && (
            <ErrorState error={viewModel.aggregatedError} message="Error loading aggregated hours" />
          )}

          {!viewModel.isLoadingAggregated && !viewModel.aggregatedError && viewModel.aggregatedData && (
            <>
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Team</TableHead>
                    <TableHead className="font-semibold">Hours Worked</TableHead>
                    <TableHead className="font-semibold">Hourly Rate</TableHead>
                    <TableHead className="font-semibold">Labor Cost</TableHead>
                    <TableHead className="font-semibold">Shift Count</TableHead>
                    <TableHead className="font-semibold">Total Breaks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewModel.aggregatedData.records && viewModel.aggregatedData.records.length > 0 ? (
                    viewModel.aggregatedData.records.map((record: AggregatedHoursRecord) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                        <TableCell>{record.user_name || record.user_id || "-"}</TableCell>
                        <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                        <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                        <TableCell>{Number(record.hours_worked || 0).toFixed(2)}</TableCell>
                        <TableCell>€{Number(record.hourly_rate || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">€{Number(record.labor_cost || 0).toFixed(2)}</TableCell>
                        <TableCell>{record.shift_count || 0}</TableCell>
                        <TableCell>{record.total_breaks_minutes || 0} min</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No aggregated hours data yet - aggregation calculations coming soon
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </UITable>

              {/* Pagination */}
              <SimplePagination
                currentPage={viewModel.currentPage}
                totalPages={viewModel.totalPages}
                totalRecords={viewModel.aggregatedData?.total || 0}
                onPageChange={viewModel.setCurrentPage}
                isLoading={viewModel.isLoadingAggregated}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
