/**
 * Productivity Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import { usePathname } from "next/navigation";
import { useMemo, useCallback } from "react";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { AutoFilterRegistry } from "@/components/navigation/auto-filter-registry";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { useProductivityViewModel } from "@/viewmodels/workforce/useProductivityViewModel";
import { ProductivityAggregation } from "@/models/workforce/productivity.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutocompleteSearch } from "@/components/view-data/AutocompleteSearch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ProductivityGoals } from "@/components/workforce/ProductivityGoals";
import { PeriodType, Division, TeamCategory } from "@/models/workforce/productivity.model";
import { applyProductivityGoals } from "@/lib/utils/productivity-goals";
import { formatDateDDMMYY } from "@/lib/dateFormatters";

interface ProductivityClientProps {
  initialData?: {
    productivityData?: any;
    locations?: any[];
    goals?: any;
  };
}

export function ProductivityClient({ initialData }: ProductivityClientProps) {
  const viewModel = useProductivityViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Auto-generate filter labels from viewModel state
  const filterLabels = useMemo(() => [
    { key: "year", label: "Year", value: viewModel.selectedYear },
    { key: "month", label: "Month", value: viewModel.selectedMonth },
    { key: "day", label: "Day", value: viewModel.selectedDay },
    { key: "location", label: "Location", value: viewModel.selectedLocation !== "all" ? viewModel.locationOptions.find(l => l.value === viewModel.selectedLocation)?.label : null },
    { key: "team", label: "Team", value: viewModel.selectedTeam !== "all" ? viewModel.selectedTeam : null },
    { key: "periodType", label: "Period Type", value: viewModel.selectedPeriodType },
    { key: "division", label: "Division", value: viewModel.selectedDivision !== "All" ? viewModel.selectedDivision : null },
    { key: "teamCategory", label: "Team Category", value: viewModel.selectedTeamCategory !== "all" ? viewModel.selectedTeamCategory : null },
    { key: "subTeam", label: "Sub-Team", value: viewModel.selectedSubTeam !== "all" ? viewModel.selectedSubTeam : null },
    { key: "worker", label: "Worker", value: viewModel.selectedWorker !== "all" ? viewModel.workerOptions.find(w => w.value === viewModel.selectedWorker)?.label : null },
  ], [
    viewModel.selectedYear,
    viewModel.selectedMonth,
    viewModel.selectedDay,
    viewModel.selectedLocation,
    viewModel.selectedTeam,
    viewModel.selectedPeriodType,
    viewModel.selectedDivision,
    viewModel.selectedTeamCategory,
    viewModel.selectedSubTeam,
    viewModel.selectedWorker,
    viewModel.locationOptions,
    viewModel.workerOptions,
  ]);

  // Filter change handlers - memoized with useCallback for stable reference
  const handleFilterChange = useCallback((key: string, value: any) => {
    switch (key) {
      case "year": viewModel.setSelectedYear(value); break;
      case "month": viewModel.setSelectedMonth(value); break;
      case "day": viewModel.setSelectedDay(value); break;
      case "location": viewModel.setSelectedLocation(value); break;
      case "team": viewModel.setSelectedTeam(value); break;
      case "periodType": viewModel.setSelectedPeriodType(value as PeriodType); break;
      case "division": viewModel.setSelectedDivision(value as Division); break;
      case "teamCategory": viewModel.setSelectedTeamCategory(value as TeamCategory | 'all'); break;
      case "subTeam": viewModel.setSelectedSubTeam(value); break;
      case "worker": viewModel.setSelectedWorker(value); break;
    }
  }, [
    viewModel.setSelectedYear,
    viewModel.setSelectedMonth,
    viewModel.setSelectedDay,
    viewModel.setSelectedLocation,
    viewModel.setSelectedTeam,
    viewModel.setSelectedPeriodType,
    viewModel.setSelectedDivision,
    viewModel.setSelectedTeamCategory,
    viewModel.setSelectedSubTeam,
    viewModel.setSelectedWorker,
  ]);

  // Filter remove handlers - memoized with useCallback for stable reference
  const handleFilterRemove = useCallback((key: string) => {
    switch (key) {
      case "year": viewModel.setSelectedYear(new Date().getFullYear()); break;
      case "month": viewModel.setSelectedMonth(null); break;
      case "day": viewModel.setSelectedDay(null); break;
      case "location": viewModel.setSelectedLocation("all"); break;
      case "team": viewModel.setSelectedTeam("all"); break;
      case "periodType": viewModel.setSelectedPeriodType("day"); break;
      case "division": viewModel.setSelectedDivision("All"); break;
      case "teamCategory": viewModel.setSelectedTeamCategory("all"); break;
      case "subTeam": viewModel.setSelectedSubTeam("all"); break;
      case "worker": viewModel.setSelectedWorker("all"); break;
    }
  }, [
    viewModel.setSelectedYear,
    viewModel.setSelectedMonth,
    viewModel.setSelectedDay,
    viewModel.setSelectedLocation,
    viewModel.setSelectedTeam,
    viewModel.setSelectedPeriodType,
    viewModel.setSelectedDivision,
    viewModel.setSelectedTeamCategory,
    viewModel.setSelectedSubTeam,
    viewModel.setSelectedWorker,
  ]);
  
  // Helper function to get goal status color
  const getGoalStatusColor = (status?: 'bad' | 'not_great' | 'ok' | 'great') => {
    switch (status) {
      case 'bad': return 'bg-red-100 text-red-800 border-red-300';
      case 'not_great': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'ok': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'great': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  // Helper function to get goal status label
  const getGoalStatusLabel = (status?: 'bad' | 'not_great' | 'ok' | 'great') => {
    switch (status) {
      case 'bad': return 'Bad';
      case 'not_great': return 'Not Great';
      case 'ok': return 'OK';
      case 'great': return 'Great';
      default: return 'Unknown';
    }
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

      {/* Debug Info - Show what DB is queried and what data is found */}
      {viewModel.productivityDebugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-blue-900">🔍 Database Query Debug Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-800">Collections Queried:</p>
              <ul className="list-disc list-inside text-blue-700">
                {viewModel.productivityDebugInfo.collectionsQueried?.map((col: string, i: number) => (
                  <li key={i}>{col}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-800">Data Found:</p>
              <ul className="list-disc list-inside text-blue-700">
                <li>Labor Records: {viewModel.productivityDebugInfo.dataFound?.laborRecords}</li>
                <li>Sales Records: {viewModel.productivityDebugInfo.dataFound?.salesRecords}</li>
                <li>Location Records: {viewModel.productivityDebugInfo.dataFound?.locationRecords}</li>
                <li>Division Records: {viewModel.productivityDebugInfo.dataFound?.divisionRecords}</li>
                <li>Team Category Records: {viewModel.productivityDebugInfo.dataFound?.teamCategoryRecords}</li>
                <li>Worker Records: {viewModel.productivityDebugInfo.dataFound?.workerRecords}</li>
              </ul>
            </div>
          </div>
          {viewModel.productivityDebugInfo.sampleLaborRecord && (
            <div className="mt-2 pt-2 border-t border-blue-300">
              <p className="font-medium text-blue-800">Sample Labor Record Structure:</p>
              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                {JSON.stringify(viewModel.productivityDebugInfo.sampleLaborRecord, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {/* Auto-registered Filters */}
        <AutoFilterRegistry
          filters={{
            labels: filterLabels,
            onFilterChange: handleFilterChange,
            onFilterRemove: handleFilterRemove,
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

          {/* Enhanced Filters with Hierarchical Structure */}
          <div className="space-y-4 mt-4">
            {/* Period Type Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Period:</label>
              <Select
                value={viewModel.selectedPeriodType}
                onValueChange={(value: PeriodType) => viewModel.setSelectedPeriodType(value)}
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
            
            {/* Division Filter (Button Pattern) */}
            <LocationFilterButtons
              options={viewModel.divisionOptions}
              selectedValue={viewModel.selectedDivision}
              onValueChange={(value) => {
                const newDivision = value as Division;
                viewModel.setSelectedDivision(newDivision);
                // Reset team category and sub-team when division changes
                viewModel.setSelectedTeamCategory('all');
                viewModel.setSelectedSubTeam('all');
              }}
              label="Division"
            />
            
            {/* Team Category Filter (Button Pattern) - Filtered by Division */}
            {viewModel.teamCategoryOptions.length > 1 && (
              <LocationFilterButtons
                options={viewModel.teamCategoryOptions}
                selectedValue={viewModel.selectedTeamCategory}
                onValueChange={(value) => {
                  viewModel.setSelectedTeamCategory(value as TeamCategory | 'all');
                  // Reset sub-team when team category changes
                  viewModel.setSelectedSubTeam('all');
                }}
                label="Main Team"
              />
            )}
            
            {/* Sub-Team Filter (Button Pattern) - Filtered by Team Category */}
            {viewModel.selectedTeamCategory !== 'all' && viewModel.subTeamOptions.length > 1 && (
              <LocationFilterButtons
                options={viewModel.subTeamOptions}
                selectedValue={viewModel.selectedSubTeam}
                onValueChange={(value) => viewModel.setSelectedSubTeam(value)}
                label="Sub-Team"
              />
            )}
            
            {/* Worker Filter (Autocomplete) */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Worker:</label>
              <AutocompleteSearch
                options={viewModel.workerOptions}
                value={viewModel.selectedWorker !== 'all' ? viewModel.selectedWorker : ''}
                onValueChange={(value) => viewModel.setSelectedWorker(value || 'all')}
                placeholder="Search worker..."
                className="w-[200px]"
              />
            </div>
          </div>
        </AutoFilterRegistry>

        {/* Productivity Table */}
        {viewModel.isLoading && <LoadingState />}

        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading productivity data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.productivityData && (
          <>
            <Tabs value={viewModel.activeTab} onValueChange={(value) => viewModel.setActiveTab(value as 'location' | 'division' | 'team' | 'worker')} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="location" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">By Location</TabsTrigger>
                <TabsTrigger value="division" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">By Division</TabsTrigger>
                <TabsTrigger value="team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">By Team</TabsTrigger>
                <TabsTrigger value="worker" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">By Worker</TabsTrigger>
              </TabsList>
              
              {/* By Location Tab - Grouped by Location per Day */}
              <TabsContent value="location" className="space-y-4">
                <UITable stickyHeader={true} stickyFirstColumn={true}>
                  <TableHeader className="!sticky !top-0">
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold text-right">Hours</TableHead>
                      <TableHead className="font-semibold text-right">Cost</TableHead>
                      <TableHead className="font-semibold text-right">Revenue</TableHead>
                      <TableHead className="font-semibold text-right">Revenue/Hour</TableHead>
                      <TableHead className="font-semibold text-right">Labor Cost %</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Use location-level records directly (from eitje_aggregated + bork_aggregated)
                      const locationData = viewModel.productivityData || [];
                      
                      return locationData.length > 0 ? (
                        locationData.flatMap((record: ProductivityAggregation) => [
                          <TableRow key={`${record.period}_${record.locationId}`}>
                            <TableCell className="whitespace-nowrap">{formatDateDDMMYY(record.period)}</TableCell>
                            <TableCell className="whitespace-nowrap">{record.locationName || record.locationId}</TableCell>
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
                          </TableRow>,
                            <TableRow key={`${record.period}_${record.locationId}_json`}>
                              <TableCell colSpan={8} className="p-2 bg-muted/30">
                                <details className="cursor-pointer">
                                  <summary className="text-xs font-mono text-muted-foreground hover:text-foreground">
                                    View JSON Data {record.sourceCreatedAt ? `(Created: ${new Date(record.sourceCreatedAt).toLocaleString()})` : ''}
                                  </summary>
                                  <pre className="mt-2 text-xs font-mono bg-background p-3 rounded border overflow-auto max-h-64">
                                    {JSON.stringify({
                                      ...record,
                                      sourceCreatedAt: record.sourceCreatedAt ? new Date(record.sourceCreatedAt).toISOString() : undefined,
                                      sourceUpdatedAt: record.sourceUpdatedAt ? new Date(record.sourceUpdatedAt).toISOString() : undefined,
                                    }, null, 2)}
                                  </pre>
                                </details>
                              </TableCell>
                            </TableRow>
                        ])
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No productivity data found
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </UITable>

                {/* Totals Summary */}
                {viewModel.productivityData && viewModel.productivityData.length > 0 && (
                  <div className="space-y-4">
                    <AggregatedCostsSummary
                      title="Summary"
                      metrics={[
                        { label: "Total Hours", value: viewModel.totals.totalHoursWorked, format: "number", decimals: 2 },
                        { label: "Total Cost", value: viewModel.totals.totalWageCost, format: "currency" },
                        { label: "Total Revenue", value: viewModel.totals.totalRevenue, format: "currency" },
                        { label: "Revenue/Hour", value: viewModel.totals.revenuePerHour, format: "currency" },
                        { label: "Labor Cost %", value: viewModel.totals.laborCostPercentage, format: "percentage", decimals: 1 },
                      ]}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ProductivityGoals
                        revenuePerHour={viewModel.totals.revenuePerHour}
                        laborCostPercentage={viewModel.totals.laborCostPercentage}
                        goalStatus={viewModel.goalsStatus || undefined}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* By Division Tab - Grouped by Division per Day */}
              <TabsContent value="division" className="space-y-4">
                {viewModel.productivityDataByDivision && viewModel.productivityDataByDivision.length > 0 ? (
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
                      {viewModel.productivityDataByDivision
                        .filter((record) => record.periodType === 'day') // Only show day-level data
                        .sort((a, b) => {
                          if (a.period !== b.period) return b.period.localeCompare(a.period);
                          return (a.locationName || '').localeCompare(b.locationName || '');
                        })
                        .map((record) => (
                        <TableRow key={`${record.period}_${record.division}_${record.locationId || 'all'}`}>
                          <TableCell className="whitespace-nowrap">{record.period}</TableCell>
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
                      ))}
                    </TableBody>
                  </UITable>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No division data available
                  </div>
                )}
              </TabsContent>
              
              {/* By Team Tab - Grouped by Team per Day */}
              <TabsContent value="team" className="space-y-4">
                {viewModel.productivityDataByTeamCategory && viewModel.productivityDataByTeamCategory.length > 0 ? (
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
                      {viewModel.productivityDataByTeamCategory
                        .filter((record) => record.periodType === 'day') // Only show day-level data
                        .sort((a, b) => {
                          if (a.period !== b.period) return b.period.localeCompare(a.period);
                          if (a.locationName !== b.locationName) return (a.locationName || '').localeCompare(b.locationName || '');
                          return (a.teamCategory || '').localeCompare(b.teamCategory || '');
                        })
                        .flatMap((record) => {
                        const rows = [];
                        // Main category row
                        rows.push(
                          <TableRow key={`${record.period}_${record.teamCategory}_${record.locationId || 'all'}_main`} className="bg-muted/50 font-medium">
                            <TableCell className="whitespace-nowrap">{record.period}</TableCell>
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
                        // Sub-team rows
                        if (record.subTeams && record.subTeams.length > 0) {
                          record.subTeams.forEach((subTeam) => {
                            rows.push(
                              <TableRow key={`${record.period}_${record.teamCategory}_${record.locationId || 'all'}_${subTeam.subTeam}`} className="bg-background">
                                <TableCell className="whitespace-nowrap"></TableCell>
                                <TableCell className="whitespace-nowrap"></TableCell>
                                <TableCell></TableCell>
                                <TableCell className="pl-6 text-muted-foreground">{subTeam.subTeam}</TableCell>
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
                      })}
                    </TableBody>
                  </UITable>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No team category data available
                  </div>
                )}
              </TabsContent>
              
              {/* By Worker Tab - Grouped by Worker per Day */}
              <TabsContent value="worker" className="space-y-4">
                {/* Missing Wage Workers Warning */}
                {viewModel.missingWageWorkers && viewModel.missingWageWorkers.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <div className="text-yellow-600 dark:text-yellow-400 font-semibold">⚠️ Missing Hourly Wages</div>
                    </div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-2">
                      {viewModel.missingWageWorkers.length} worker(s) are missing hourly wages and were skipped from calculations. 
                      Add wages in the Workers page to include them.
                    </p>
                    <div className="mt-3 space-y-1">
                      {viewModel.missingWageWorkers.slice(0, 10).map((worker, idx) => (
                        <div key={idx} className="text-xs text-yellow-700 dark:text-yellow-400">
                          • {worker.workerName} (ID: {worker.workerId}, Eitje: {worker.eitjeUserId}) at {worker.locationName}
                        </div>
                      ))}
                      {viewModel.missingWageWorkers.length > 10 && (
                        <div className="text-xs text-yellow-700 dark:text-yellow-400">
                          ... and {viewModel.missingWageWorkers.length - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {viewModel.productivityDataByWorker && viewModel.productivityDataByWorker.length > 0 ? (
                  <UITable stickyHeader={true} stickyFirstColumn={true}>
                    <TableHeader className="!sticky !top-0">
                      <TableRow>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="font-semibold">Location</TableHead>
                        <TableHead className="font-semibold">Worker</TableHead>
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
                      {viewModel.productivityDataByWorker
                        .filter((record) => record.periodType === 'day') // Only show day-level data
                        .sort((a, b) => {
                          if (a.period !== b.period) return b.period.localeCompare(a.period);
                          if (a.locationName !== b.locationName) return (a.locationName || '').localeCompare(b.locationName || '');
                          return (a.workerName || '').localeCompare(b.workerName || '');
                        })
                        .map((record) => (
                        <TableRow key={`${record.period}_${record.workerId}_${record.locationId || 'all'}`}>
                          <TableCell className="whitespace-nowrap">{formatDateDDMMYY(record.period)}</TableCell>
                          <TableCell className="whitespace-nowrap">{record.locationName || record.locationId}</TableCell>
                          <TableCell>{record.workerName}</TableCell>
                          <TableCell>{record.teamCategory || "All"}</TableCell>
                          <TableCell>{record.subTeam || "All"}</TableCell>
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
                      ))}
                    </TableBody>
                  </UITable>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {viewModel.missingWageWorkers && viewModel.missingWageWorkers.length > 0 
                      ? "No worker data available (all workers missing hourly wages)"
                      : "No worker data available"}
                  </div>
                )}
              </TabsContent>
            </Tabs>

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




