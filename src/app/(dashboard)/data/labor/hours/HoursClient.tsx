/**
 * Hours V2 Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";
import { formatDateDDMMYY, formatTimeOnly } from "@/lib/dateFormatters";
import { useHoursV2ViewModel } from "@/viewmodels/workforce/useHoursV2ViewModel";
import { ProcessedHoursRecord } from "@/models/workforce/hours-v2.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { ClickableWorkerName } from "@/components/workforce/ClickableWorkerName";

interface HoursClientProps {
  initialData?: {
    processedData?: any;
    locations?: any[];
    teams?: any[];
  };
}

export function HoursClient({ initialData }: HoursClientProps) {
  const viewModel = useHoursV2ViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}
      
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
          label="Shift"
        />
      </div>

      {/* Hours Table */}
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
              coreColumnCount={12}
              totalColumnCount={19}
            />
          </div>
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Team</TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Start</TableHead>
                <TableHead className="font-semibold">End</TableHead>
                <TableHead className="font-semibold">Hours</TableHead>
                <TableHead className="font-semibold">Hourly Wage</TableHead>
                <TableHead className="font-semibold">Wage Cost</TableHead>
                <TableHead className="font-semibold">Shift</TableHead>
                <TableHead className="font-semibold">Remarks</TableHead>
                <TableHead className="font-semibold">Break</TableHead>
                {viewModel.showAllColumns && (
                  <>
                    <TableHead className="font-semibold">Eitje ID</TableHead>
                    <TableHead className="font-semibold">Approved</TableHead>
                    <TableHead className="font-semibold">Planning Shift ID</TableHead>
                    <TableHead className="font-semibold">Exported to HR</TableHead>
                    <TableHead className="font-semibold">Updated At</TableHead>
                    <TableHead className="font-semibold">Created At</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewModel.processedData.records && viewModel.processedData.records.length > 0 ? (
                viewModel.processedData.records.map((record: ProcessedHoursRecord) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                    <TableCell className="whitespace-nowrap">{record.environment_name || record.environment_id || "-"}</TableCell>
                    <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                    <TableCell>
                      {record.user_name || record.user_id ? (
                        <ClickableWorkerName 
                          worker={{
                            eitje_user_id: record.user_id,
                            user_name: record.user_name,
                          }}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{record.start ? formatTimeOnly(record.start) : "-"}</TableCell>
                    <TableCell>{record.end ? formatTimeOnly(record.end) : "-"}</TableCell>
                    <TableCell>{record.worked_hours !== null && record.worked_hours !== undefined ? Number(record.worked_hours).toFixed(2) : "-"}</TableCell>
                    <TableCell>{record.hourly_wage !== null && record.hourly_wage !== undefined ? `€${Number(record.hourly_wage).toFixed(2)}` : "-"}</TableCell>
                    <TableCell>{record.wage_cost !== null && record.wage_cost !== undefined ? `€${Number(record.wage_cost).toFixed(2)}` : "-"}</TableCell>
                    <TableCell>{record.type_name || record.shift_type || "-"}</TableCell>
                    <TableCell>{record.remarks || "-"}</TableCell>
                    <TableCell>{record.break_minutes || 0}</TableCell>
                    {viewModel.showAllColumns && (
                      <>
                        <TableCell>{record.eitje_id || "-"}</TableCell>
                        <TableCell>{record.approved !== null ? (record.approved ? "Yes" : "No") : "-"}</TableCell>
                        <TableCell>{record.planning_shift_id || "-"}</TableCell>
                        <TableCell>{record.exported_to_hr_integration !== null ? (record.exported_to_hr_integration ? "Yes" : "No") : "-"}</TableCell>
                        <TableCell>{record.updated_at ? formatDateDDMMYY(record.updated_at) : "-"}</TableCell>
                        <TableCell>{record.created_at ? formatDateDDMMYY(record.created_at) : "-"}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={viewModel.showAllColumns ? 19 : 12} className="text-center py-8 text-muted-foreground">
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
      </div>
    </div>
  );
}

