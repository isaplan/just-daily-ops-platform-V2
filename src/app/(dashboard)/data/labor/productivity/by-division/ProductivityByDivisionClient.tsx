'use client';

import { usePathname } from 'next/navigation';
import { getBreadcrumb } from '@/lib/navigation/breadcrumb-registry';
import { useProductivityViewModel } from '@/viewmodels/workforce/useProductivityViewModel';
import { ProductivityByDivision } from '@/models/workforce/productivity.model';
import { formatDateDDMMYY } from '@/lib/dateFormatters';
import { cn } from '@/lib/utils';
import { AutoFilterRegistry } from '@/components/navigation/auto-filter-registry';
import { EitjeDataFilters } from '@/components/view-data/EitjeDataFilters';
import { UITable } from '@/components/view-data/UITable';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getGoalStatusColor, getGoalStatusLabel } from '@/lib/utils/productivity-goals';

interface ProductivityByDivisionClientProps {
  initialData?: {
    productivityData?: any;
    locations?: any[];
  };
}

export function ProductivityByDivisionClient({ initialData }: ProductivityByDivisionClientProps) {
  const viewModel = useProductivityViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

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

        {!viewModel.isLoading && !viewModel.error && viewModel.productivityDataByDivision && (
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Division</TableHead>
                <TableHead className="font-semibold text-right">Hours</TableHead>
                <TableHead className="font-semibold text-right">Cost</TableHead>
                <TableHead className="font-semibold text-right">Revenue</TableHead>
                <TableHead className="font-semibold text-right">Revenue/Hour</TableHead>
                <TableHead className="font-semibold text-right">Labor Cost %</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewModel.productivityDataByDivision.length > 0 ? (
                viewModel.productivityDataByDivision
                  .filter((record) => record.periodType === 'day')
                  .map((record: ProductivityByDivision) => (
                    <TableRow key={`${record.period}_${record.division}_${record.locationId || 'all'}`}>
                      <TableCell className="whitespace-nowrap">{formatDateDDMMYY(record.period)}</TableCell>
                      <TableCell className="whitespace-nowrap">{record.locationName || record.locationId}</TableCell>
                      <TableCell>{record.division}</TableCell>
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
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No division data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </UITable>
        )}

        {viewModel.isLoading && (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        )}

        {viewModel.error && (
          <div className="text-center py-8 text-red-600">Error: {viewModel.error.message}</div>
        )}
      </div>
    </div>
  );
}

