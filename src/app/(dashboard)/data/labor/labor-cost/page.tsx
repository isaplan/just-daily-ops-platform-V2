/**
 * Labor Cost V2 View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { WorkerSearch } from "@/components/view-data/WorkerSearch";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { useLaborCostViewModel } from "@/viewmodels/workforce/useLaborCostViewModel";
import { LaborCostRecord } from "@/models/workforce/labor-cost.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LaborCostPage() {
  const viewModel = useLaborCostViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Format currency
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "-";
    return `€${Number(value).toFixed(2)}`;
  };

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

        {/* Team, Worker, and Time Period Filters */}
        <div className="flex gap-6 flex-wrap items-end">
          <LocationFilterButtons
            options={viewModel.teamOptions}
            selectedValue={viewModel.selectedTeam}
            onValueChange={viewModel.setSelectedTeam}
            label="Team"
          />
          <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Worker</span>
            <WorkerSearch
              options={viewModel.workerOptions}
              selectedValue={viewModel.selectedWorker}
              onValueChange={viewModel.setSelectedWorker}
              placeholder="Search worker..."
            />
          </div>
          <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Time Period</span>
            <Tabs 
              value={viewModel.selectedTimePeriod} 
              onValueChange={(value) => viewModel.setSelectedTimePeriod(value as "year" | "month" | "week" | "day")}
            >
              <TabsList>
                <TabsTrigger value="year">Year</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Labor Cost Table */}
        {viewModel.isLoading && <LoadingState />}

        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading labor cost data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.laborCostData && viewModel.laborCostData.length > 0 && (
          <>
            <UITable stickyHeader={true} stickyFirstColumn={true}>
              <TableHeader className="!sticky !top-0">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Team</TableHead>
                  <TableHead className="font-semibold">Worker</TableHead>
                  <TableHead className="font-semibold">Hours</TableHead>
                  <TableHead className="font-semibold">Cost per Hour</TableHead>
                  <TableHead className="font-semibold">Cost per Day</TableHead>
                  <TableHead className="font-semibold">Cost per Week</TableHead>
                  <TableHead className="font-semibold">Cost per Month</TableHead>
                  <TableHead className="font-semibold">Cost per Year</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.laborCostData.map((record: LaborCostRecord) => {
                  // Calculate costs per period for this record
                  const laborCost = record.labor_cost || 0;
                  const hoursWorked = record.hours_worked || 0;
                  
                  // Cost per hour: labor cost / hours worked
                  const costPerHour = hoursWorked > 0 ? laborCost / hoursWorked : 0;
                  
                  // Cost per day: the record's labor cost (already daily)
                  const costPerDay = laborCost;
                  
                  // Cost per week: multiply daily cost by 7 (assuming 7-day week)
                  const costPerWeek = costPerDay * 7;
                  
                  // Cost per month: multiply daily cost by average days in month (30.44)
                  const costPerMonth = costPerDay * 30.44;
                  
                  // Cost per year: multiply daily cost by 365
                  const costPerYear = costPerDay * 365;

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.environment_name || record.environment_id || "-"}
                      </TableCell>
                      <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                      <TableCell>{record.user_name || record.user_id || "-"}</TableCell>
                      <TableCell>
                        {hoursWorked !== null && hoursWorked !== undefined 
                          ? Number(hoursWorked).toFixed(2) 
                          : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(costPerHour)}</TableCell>
                      <TableCell>{formatCurrency(costPerDay)}</TableCell>
                      <TableCell>{formatCurrency(costPerWeek)}</TableCell>
                      <TableCell>{formatCurrency(costPerMonth)}</TableCell>
                      <TableCell>{formatCurrency(costPerYear)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </UITable>

            {/* Summary */}
            <div className="mt-4 p-4 bg-muted/50 rounded-sm border border-black">
              <h3 className="text-sm font-semibold mb-2">Aggregated Costs</h3>
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Per Hour:</span>{" "}
                  <span className="font-semibold">{formatCurrency(viewModel.aggregatedCosts.perHour)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Day:</span>{" "}
                  <span className="font-semibold">{formatCurrency(viewModel.aggregatedCosts.perDay)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Week:</span>{" "}
                  <span className="font-semibold">{formatCurrency(viewModel.aggregatedCosts.perWeek)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Month:</span>{" "}
                  <span className="font-semibold">{formatCurrency(viewModel.aggregatedCosts.perMonth)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Year:</span>{" "}
                  <span className="font-semibold">{formatCurrency(viewModel.aggregatedCosts.perYear)}</span>
                </div>
              </div>
            </div>

            {/* Pagination */}
            <SimplePagination
              currentPage={viewModel.currentPage}
              totalPages={viewModel.totalPages}
              totalRecords={viewModel.laborCostData.length}
              onPageChange={viewModel.setCurrentPage}
              isLoading={viewModel.isLoading}
            />
          </>
        )}

        {!viewModel.isLoading && !viewModel.error && (!viewModel.laborCostData || viewModel.laborCostData.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            No labor cost data found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

