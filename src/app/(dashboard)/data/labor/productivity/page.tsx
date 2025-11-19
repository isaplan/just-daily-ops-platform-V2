/**
 * Labor Productivity View Layer
 * Pure presentational component - all business logic is in ViewModel
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
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { useProductivityViewModel } from "@/viewmodels/workforce/useProductivityViewModel";
import { ProductivityAggregation } from "@/models/workforce/productivity.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProductivityPage() {
  const viewModel = useProductivityViewModel();
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

        {/* Team and Period Type Filters */}
        <div className="flex gap-6 flex-wrap">
          <LocationFilterButtons
            options={viewModel.teamOptions}
            selectedValue={viewModel.selectedTeam}
            onValueChange={viewModel.setSelectedTeam}
            label="Team"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Period:</label>
            <Select
              value={viewModel.selectedPeriodType}
              onValueChange={(value: "day" | "week" | "month") => viewModel.setSelectedPeriodType(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {viewModel.periodTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Totals Summary */}
        {viewModel.productivityData && viewModel.productivityData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-lg font-semibold">{viewModel.totals.totalHoursWorked.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-lg font-semibold">€{viewModel.totals.totalWageCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-semibold">€{viewModel.totals.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Revenue/Hour</p>
              <p className="text-lg font-semibold">€{viewModel.totals.revenuePerHour.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Labor Cost %</p>
              <p className="text-lg font-semibold">{viewModel.totals.laborCostPercentage.toFixed(1)}%</p>
            </div>
          </div>
        )}

        {/* Productivity Table */}
        {viewModel.isLoading && <LoadingState />}

        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading productivity data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.productivityData && (
          <>
            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Period</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Team</TableHead>
                  <TableHead className="font-semibold text-right">Hours</TableHead>
                  <TableHead className="font-semibold text-right">Cost</TableHead>
                  <TableHead className="font-semibold text-right">Revenue</TableHead>
                  <TableHead className="font-semibold text-right">Revenue/Hour</TableHead>
                  <TableHead className="font-semibold text-right">Labor Cost %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.productivityData.length > 0 ? (
                  viewModel.productivityData.map((record: ProductivityAggregation) => (
                    <TableRow key={`${record.period}_${record.locationId}_${record.teamId}`}>
                      <TableCell className="whitespace-nowrap">{record.period}</TableCell>
                      <TableCell className="whitespace-nowrap">{record.locationName || record.locationId}</TableCell>
                      <TableCell>{record.teamName || "Total"}</TableCell>
                      <TableCell className="text-right">{record.totalHoursWorked.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{record.totalWageCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{record.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{record.revenuePerHour.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{record.laborCostPercentage.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No productivity data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </UITable>

            {/* Pagination */}
            <SimplePagination
              currentPage={viewModel.currentPage}
              totalPages={viewModel.totalPages}
              totalRecords={viewModel.productivityData?.length || 0}
              onPageChange={viewModel.setCurrentPage}
              isLoading={viewModel.isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

