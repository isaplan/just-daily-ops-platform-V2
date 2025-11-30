'use client';

import { usePathname } from 'next/navigation';
import { getBreadcrumb } from '@/lib/navigation/breadcrumb-registry';
import { useProductivityViewModel } from '@/viewmodels/workforce/useProductivityViewModel';
import { ProductivityByTeamCategory } from '@/models/workforce/productivity.model';
import { formatDateDDMMYY } from '@/lib/dateFormatters';
import { cn } from '@/lib/utils';
import { AutoFilterRegistry } from '@/components/navigation/auto-filter-registry';
import { EitjeDataFilters } from '@/components/view-data/EitjeDataFilters';
import { UITable } from '@/components/view-data/UITable';
import { TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getGoalStatusColor, getGoalStatusLabel } from '@/lib/utils/productivity-goals';

interface ProductivityByTeamClientProps {
  initialData?: {
    productivityData?: any;
    locations?: any[];
  };
}

export function ProductivityByTeamClient({ initialData }: ProductivityByTeamClientProps) {
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

        {!viewModel.isLoading && !viewModel.error && viewModel.productivityDataByTeamCategory && (
          <UITable>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Sub-Team</TableHead>
                <TableHead className="font-semibold text-right">Hours</TableHead>
                <TableHead className="font-semibold text-right">Cost</TableHead>
                <TableHead className="font-semibold text-right">Revenue</TableHead>
                <TableHead className="font-semibold text-right">Revenue/Hour</TableHead>
                <TableHead className="font-semibold text-right">Labor Cost %</TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewModel.productivityDataByTeamCategory.length > 0 ? (
                viewModel.productivityDataByTeamCategory
                  .filter((record) => record.periodType === 'day')
                  .flatMap((record: ProductivityByTeamCategory) => {
                    const rows = [];
                    rows.push(
                      <TableRow key={`${record.period}_${record.teamCategory}_${record.locationId || 'all'}_main`} className="bg-muted/50 font-medium">
                        <TableCell className="whitespace-nowrap">{formatDateDDMMYY(record.period)}</TableCell>
                        <TableCell className="whitespace-nowrap">{record.locationName || record.locationId}</TableCell>
                        <TableCell className="font-semibold">{record.teamCategory}</TableCell>
                        <TableCell className="font-semibold">Total</TableCell>
                        <TableCell className="text-right font-semibold">{record.totalHoursWorked.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">€{record.totalWageCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">€{record.totalRevenue.toFixed(2)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", 
                          record.goalStatus === 'bad' ? 'text-red-600' :
                          record.goalStatus === 'not_great' ? 'text-orange-600' :
                          record.goalStatus === 'ok' ? 'text-yellow-600' :
                          record.goalStatus === 'great' ? 'text-green-600' : ''
                        )}>
                          €{record.revenuePerHour.toFixed(2)}
                        </TableCell>
                        <TableCell className={cn("text-right font-semibold",
                          record.laborCostPercentage > 32.5 ? 'text-red-600' :
                          record.laborCostPercentage >= 30 ? 'text-yellow-600' :
                          'text-green-600'
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
                    );
                    if (record.subTeams && record.subTeams.length > 0) {
                      record.subTeams.forEach((subTeam) => {
                        rows.push(
                          <TableRow key={`${record.period}_${record.teamCategory}_${record.locationId || 'all'}_${subTeam.subTeam}`}>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="pl-4">{subTeam.subTeam}</TableCell>
                            <TableCell className="text-right">{subTeam.totalHoursWorked.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{subTeam.totalWageCost.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{subTeam.totalRevenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right">€{subTeam.revenuePerHour.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{subTeam.laborCostPercentage.toFixed(1)}%</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        );
                      });
                    }
                    return rows;
                  })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No team data available
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

