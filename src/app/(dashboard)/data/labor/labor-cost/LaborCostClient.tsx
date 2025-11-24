/**
 * Labor Cost V2 Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { AutocompleteSearch } from "@/components/view-data/AutocompleteSearch";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { formatCurrency } from "@/lib/utils";
import { useLaborCostViewModel } from "@/viewmodels/workforce/useLaborCostViewModel";
import { LaborCostRecord } from "@/models/workforce/labor-cost.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { ClickableWorkerName } from "@/components/workforce/ClickableWorkerName";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";
import { LaborCostResponse } from "@/models/workforce/labor-cost.model";
import { LocationOption } from "@/models/workforce/labor-cost.model";

interface LaborCostClientProps {
  initialData?: {
    laborCostData?: LaborCostResponse;
    locations?: any[];
  };
}

export function LaborCostClient({ initialData }: LaborCostClientProps) {
  const viewModel = useLaborCostViewModel(initialData);
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

        {/* Team, Worker, and Time Period Filters */}
        <div className="flex gap-6 flex-wrap items-end">
          <LocationFilterButtons
            options={viewModel.teamOptions}
            selectedValue={viewModel.selectedTeam}
            onValueChange={viewModel.setSelectedTeam}
            label="Team"
          />
          <AutocompleteSearch
            options={viewModel.workerOptions.map(opt => ({
              value: opt.value,
              label: opt.label,
              userId: opt.userId,
            }))}
            value={viewModel.selectedWorker || ""}
            onValueChange={viewModel.setSelectedWorker}
            placeholder="Search worker..."
            label="Worker"
            emptyMessage="No workers found."
            filterFn={(option, search) => {
              const searchLower = search.toLowerCase();
              return option.label.toLowerCase().includes(searchLower) || 
                     String(option.userId || '').includes(searchLower);
            }}
          />
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

        {/* Aggregated Costs Summary */}
        {!viewModel.isLoading && !viewModel.error && viewModel.laborCostData && viewModel.laborCostData.length > 0 && viewModel.aggregatedCosts && (
          <AggregatedCostsSummary
            title="Aggregated Costs"
            metrics={[
              { label: "Avg per Hour", value: viewModel.aggregatedCosts.perHour, format: "currency" },
              { label: "Avg per Day", value: viewModel.aggregatedCosts.perDay, format: "currency" },
              { label: "Avg per Month", value: viewModel.aggregatedCosts.perMonth, format: "currency" },
            ]}
          />
        )}

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

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.environment_name || record.environment_id || "-"}
                      </TableCell>
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
                      <TableCell>
                        {hoursWorked !== null && hoursWorked !== undefined 
                          ? Number(hoursWorked).toFixed(2) 
                          : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(costPerHour)}</TableCell>
                      <TableCell>{formatCurrency(costPerDay)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </UITable>

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

