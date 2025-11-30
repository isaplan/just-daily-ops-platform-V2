'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { getBreadcrumb } from '@/lib/navigation/breadcrumb-registry';
import { useProductivityViewModel } from '@/viewmodels/workforce/useProductivityViewModel';
import { WorkerProductivity } from '@/models/workforce/productivity.model';
import { formatDateDDMMYY } from '@/lib/dateFormatters';
import { cn } from '@/lib/utils';
import { AutoFilterRegistry } from '@/components/navigation/auto-filter-registry';
import { EitjeDataFilters } from '@/components/view-data/EitjeDataFilters';
import { UITable } from '@/components/view-data/UITable';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getGoalStatusColor, getGoalStatusLabel, applyProductivityGoals } from '@/lib/utils/productivity-goals';

interface ProductivityByWorkerClientProps {
  initialData?: {
    workerData?: WorkerProductivity[];
    locations?: any[];
  };
}

export function ProductivityByWorkerClient({ initialData }: ProductivityByWorkerClientProps) {
  const viewModel = useProductivityViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  const [revenueType, setRevenueType] = useState<'absolute' | 'relative'>('absolute');
  
  // Transform worker data based on selected revenue type
  const transformedWorkerData = useMemo(() => {
    if (!viewModel.productivityDataByWorker) return [];
    
    return viewModel.productivityDataByWorker.map(worker => {
      if (revenueType === 'absolute') {
        // Service & Bar Staff view: Use Service/Bar-only hours (exclude Management)
        const serviceBarHours = (worker as any).serviceBarHours || 0;
        const serviceBarWageCost = (worker as any).serviceBarWageCost || 0;
        
        // Only show workers who have Service/Bar hours
        if (serviceBarHours === 0) {
          return null; // Filter out workers with no Service/Bar hours
        }
        
        // Recalculate metrics using Service/Bar-only hours
        const revenuePerHour = serviceBarHours > 0
          ? (worker.absoluteRevenue || 0) / serviceBarHours
          : 0;
        const laborCostPercentage = (worker.absoluteRevenue || 0) > 0
          ? (serviceBarWageCost / (worker.absoluteRevenue || 1)) * 100
          : 0;
        
        return {
          ...worker,
          totalHoursWorked: serviceBarHours, // Use Service/Bar-only hours
          totalWageCost: serviceBarWageCost, // Use Service/Bar-only wage cost
          totalRevenue: worker.absoluteRevenue || 0,
          revenuePerHour,
          laborCostPercentage,
          goalStatus: revenuePerHour > 0
            ? applyProductivityGoals(revenuePerHour, laborCostPercentage)
            : undefined,
        };
      } else {
        // Use relative revenue (all staff have values)
        return {
          ...worker,
          totalRevenue: worker.relativeRevenue || 0,
          revenuePerHour: worker.relativeRevenuePerHour || 0,
          laborCostPercentage: (worker.relativeRevenue || 0) > 0
            ? (worker.totalWageCost / (worker.relativeRevenue || 1)) * 100
            : 0,
          goalStatus: worker.relativeRevenuePerHour
            ? applyProductivityGoals(worker.relativeRevenuePerHour, (worker.relativeRevenue || 0) > 0 ? (worker.totalWageCost / (worker.relativeRevenue || 1)) * 100 : 0)
            : undefined,
        };
      }
    }).filter((worker): worker is WorkerProductivity => worker !== null); // Filter out null entries
  }, [viewModel.productivityDataByWorker, revenueType]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}

      <div className="space-y-6">
        <AutoFilterRegistry
          filters={{
            labels: [
              { key: "year", label: "Year", value: viewModel.selectedYear },
              { key: "month", label: "Month", value: viewModel.selectedMonth },
              { key: "day", label: "Day", value: viewModel.selectedDay },
              { key: "location", label: "Location", value: viewModel.selectedLocation !== "all" ? viewModel.locationOptions.find(l => l.value === viewModel.selectedLocation)?.label : null },
              { key: "periodType", label: "Period Type", value: viewModel.selectedPeriodType },
            ],
            onFilterChange: () => {},
            onFilterRemove: () => {},
          }}
        >
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
        </AutoFilterRegistry>

        {viewModel.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">Error loading worker data</p>
            <p className="mt-1 text-sm text-red-600">{viewModel.error.message}</p>
          </div>
        )}

        {!viewModel.isLoading && !viewModel.error && (
          <>
            <Tabs value={revenueType} onValueChange={(value) => setRevenueType(value as 'absolute' | 'relative')} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="absolute">Service & Bar Staff</TabsTrigger>
                <TabsTrigger value="relative">Relative Revenue</TabsTrigger>
              </TabsList>
              
              <TabsContent value="absolute" className="mt-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Service & Bar Staff:</strong> Shows hours and revenue for Service and Bar teams only. Management hours are excluded. For workers with multiple teams, only their Service/Bediening hours are shown.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="relative" className="mt-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Relative Revenue:</strong> Proportional revenue sharing. All staff (service + kitchen + bar) show values based on hours worked.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {(!transformedWorkerData || transformedWorkerData.length === 0) ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
                <p className="text-sm font-medium text-yellow-800">
                  {revenueType === 'absolute' 
                    ? 'No worker data available (Service & Bar Staff)' 
                    : 'No worker data available (Relative Revenue)'}
                </p>
                <p className="mt-2 text-sm text-yellow-600">
                  {revenueType === 'absolute' 
                    ? 'No Service or Bar staff found with hours for the selected period. Management hours are excluded.'
                    : 'No workers found with calculated relative revenue for the selected period.'}
                </p>
                <p className="mt-2 text-sm text-yellow-600">
                  This could mean:
                </p>
                <ul className="mt-2 list-inside list-disc text-left text-sm text-yellow-600">
                  {revenueType === 'absolute' ? (
                    <>
                      <li>No Service or Bar staff have hours during the selected date range</li>
                      <li>All workers may have only Management hours (which are excluded)</li>
                      <li>The Bork aggregation hasn't been run yet (run <code className="rounded bg-yellow-100 px-1 py-0.5">/api/bork/v2/aggregate</code>)</li>
                      <li>The <code className="rounded bg-yellow-100 px-1 py-0.5">bork_aggregated.workerBreakdownHourly</code> data is missing</li>
                      <li>The <code className="rounded bg-yellow-100 px-1 py-0.5">processed_hours_aggregated</code> data is missing</li>
                    </>
                  ) : (
                    <>
                      <li>No workers have hours worked during the selected date range</li>
                      <li>The Bork aggregation hasn't been run yet (run <code className="rounded bg-yellow-100 px-1 py-0.5">/api/bork/v2/aggregate</code>)</li>
                      <li>The <code className="rounded bg-yellow-100 px-1 py-0.5">bork_aggregated.divisionHourlyBreakdown</code> data is missing</li>
                      <li>The <code className="rounded bg-yellow-100 px-1 py-0.5">processed_hours_aggregated</code> data is missing</li>
                    </>
                  )}
                  <li>The worker aggregation hasn't been run yet (run <code className="rounded bg-yellow-100 px-1 py-0.5">/api/admin/aggregate-worker-profiles</code>)</li>
                  <li>The selected date range has no data</li>
                </ul>
                <p className="mt-4 text-xs text-yellow-500">
                  Debug info: Raw worker data count = {viewModel.productivityDataByWorker?.length || 0}, Transformed count = {transformedWorkerData?.length || 0}
                </p>
                <p className="mt-4 text-xs text-yellow-500">
                  Check the server console logs for detailed diagnostics.
                </p>
              </div>
            ) : (
              <UITable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Worker</TableHead>
                    <TableHead className="font-semibold">Team</TableHead>
                    <TableHead className="font-semibold text-right">Hours</TableHead>
                    <TableHead className="font-semibold text-right">Cost</TableHead>
                    <TableHead className="font-semibold text-right">Revenue</TableHead>
                    <TableHead className="font-semibold text-right">Revenue/Hour</TableHead>
                    <TableHead className="font-semibold text-right">Labor Cost %</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transformedWorkerData.length > 0 ? (
                transformedWorkerData
                  .filter((record) => {
                    // Filter by period type
                    if (record.periodType !== 'day') return false;
                    
                    // For Service & Bar Staff tab: only show workers with Service/Bar hours > 0
                    // (already filtered in transformedWorkerData, but keep for safety)
                    if (revenueType === 'absolute') {
                      return (record.totalHoursWorked || 0) > 0 && (record.absoluteRevenue || 0) > 0;
                    } else {
                      // Relative: show all workers, even if revenue is 0
                      return true;
                    }
                  })
                  .map((record: WorkerProductivity) => (
                    <TableRow key={`${record.period}_${record.workerId}_${record.locationId || 'all'}`}>
                      <TableCell className="whitespace-nowrap">{formatDateDDMMYY(record.period)}</TableCell>
                      <TableCell className="whitespace-nowrap">{record.locationName || record.locationId}</TableCell>
                      <TableCell>{record.workerName}</TableCell>
                      <TableCell>{record.subTeam}</TableCell>
                      <TableCell className="text-right">{record.totalHoursWorked.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{record.totalWageCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">€{record.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell className={cn("text-right", 
                        record.goalStatus === 'bad' ? 'text-red-600 font-semibold' :
                        record.goalStatus === 'not_great' ? 'text-orange-600 font-semibold' :
                        record.goalStatus === 'ok' ? 'text-yellow-600 font-semibold' :
                        record.goalStatus === 'great' ? 'text-green-600 font-semibold' : ''
                      )}>
                        €{record.revenuePerHour.toFixed(2)}
                      </TableCell>
                      <TableCell className={cn("text-right",
                        record.laborCostPercentage > 32.5 ? 'text-red-600 font-semibold' :
                        record.laborCostPercentage >= 30 ? 'text-yellow-600 font-semibold' :
                        'text-green-600 font-semibold'
                      )}>
                        {record.laborCostPercentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-center">
                        {record.goalStatus && (
                          <Badge className={cn("border", getGoalStatusColor(record.goalStatus))}>
                            {getGoalStatusLabel(record.goalStatus)}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No worker data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </UITable>
            )}
          </>
        )}

        {viewModel.isLoading && (
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-muted-foreground">Loading worker data...</p>
          </div>
        )}
      </div>
    </div>
  );
}

