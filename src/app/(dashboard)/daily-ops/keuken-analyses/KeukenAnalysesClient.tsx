/**
 * Keuken Analyses Client Component
 * Interactive UI for Daily Ops Keuken Analyses page
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { AutocompleteSearch, AutocompleteOption } from "@/components/view-data/AutocompleteSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { useKeukenAnalysesViewModel } from "@/viewmodels/daily-ops/useKeukenAnalysesViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatNumber } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChefHat, Clock, Package, TrendingUp } from "lucide-react";
import { KeukenAnalysesData, TimeRangeFilter } from "@/models/daily-ops/keuken-analyses.model";
import { CalculationBreakdown } from "@/components/daily-ops/CalculationBreakdown";

interface KeukenAnalysesClientProps {
  initialData?: KeukenAnalysesData;
}

export function KeukenAnalysesClient({ initialData }: KeukenAnalysesClientProps) {
  const viewModel = useKeukenAnalysesViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  
  // Helper function to get calculation breakdown for KPIs
  const getCalculationBreakdown = (kpiName: string, data: KeukenAnalysesData) => {
    const baseDataSource = {
      collection: "keuken_analyses_aggregated",
      query: `keukenAnalyses(locationId, startDate, endDate, timeRangeFilter, selectedWorkerId)`,
      filters: {
        locationId: viewModel.selectedLocation || "all",
        startDate: viewModel.startDate?.toISOString() || "",
        endDate: viewModel.endDate?.toISOString() || "",
        timeRangeFilter: viewModel.selectedTimeRange,
        selectedWorkerId: viewModel.selectedWorker || undefined,
      },
    };

    switch (kpiName) {
      case "Products Produced":
        return {
          kpiName: "Products Produced",
          kpiValue: data.kpis.totalProductsProduced,
          dataSource: baseDataSource,
          formula: "SUM(productProduction[].totalQuantity)",
          inputs: [
            {
              label: "Product Production Records",
              value: data.productProduction.length,
              source: "productProduction array",
            },
            {
              label: "Total Quantity",
              value: data.productProduction.reduce((sum, p) => sum + p.totalQuantity, 0),
              source: "Sum of all product quantities",
            },
          ],
          steps: [
            {
              step: 1,
              description: "Aggregate product production across all days",
              calculation: "For each day: SUM(productProduction[].totalQuantity)",
              result: data.kpis.totalProductsProduced,
            },
          ],
        };

      case "Workload":
        return {
          kpiName: "Total Workload Minutes",
          kpiValue: data.kpis.totalWorkloadMinutes,
          dataSource: baseDataSource,
          formula: "SUM(productProduction[].totalWorkloadMinutes)",
          inputs: [
            {
              label: "Product Production Records",
              value: data.productProduction.length,
              source: "productProduction array",
            },
            {
              label: "Total Workload Minutes",
              value: data.productProduction.reduce((sum, p) => sum + p.totalWorkloadMinutes, 0),
              source: "Sum of quantity × workloadMinutes per product",
            },
          ],
          steps: [
            {
              step: 1,
              description: "Calculate workload per product",
              calculation: "For each product: totalQuantity × workloadMinutes",
              result: data.productProduction.reduce((sum, p) => sum + p.totalWorkloadMinutes, 0),
            },
            {
              step: 2,
              description: "Sum all product workloads",
              calculation: "SUM(productProduction[].totalWorkloadMinutes)",
              result: data.kpis.totalWorkloadMinutes,
            },
          ],
        };

      case "Avg/Hour":
        return {
          kpiName: "Average Workload Per Hour",
          kpiValue: data.kpis.averageWorkloadPerHour,
          dataSource: baseDataSource,
          formula: "totalWorkloadMinutes / hoursWithData",
          inputs: [
            {
              label: "Total Workload Minutes",
              value: data.kpis.totalWorkloadMinutes,
              source: "Sum of all workload minutes",
            },
            {
              label: "Hours With Data",
              value: data.workloadByHour.length,
              source: "workloadByHour array length",
            },
          ],
          steps: [
            {
              step: 1,
              description: "Count hours with workload data",
              calculation: "COUNT(workloadByHour WHERE totalWorkloadMinutes > 0)",
              result: data.workloadByHour.length,
            },
            {
              step: 2,
              description: "Calculate average",
              calculation: `${data.kpis.totalWorkloadMinutes} / ${data.workloadByHour.length}`,
              result: data.kpis.averageWorkloadPerHour,
            },
          ],
        };

      case "Peak Time":
        return {
          kpiName: "Peak Time Range",
          kpiValue: data.kpis.peakTimeRange,
          dataSource: baseDataSource,
          formula: "MAX(workloadByRange[].totalWorkloadMinutes).timeRange",
          inputs: [
            {
              label: "Lunch Workload",
              value: data.workloadByRange.find((r) => r.timeRange === "lunch")?.totalWorkloadMinutes || 0,
              source: "workloadByRange[lunch]",
            },
            {
              label: "Dinner Workload",
              value: data.workloadByRange.find((r) => r.timeRange === "dinner")?.totalWorkloadMinutes || 0,
              source: "workloadByRange[dinner]",
            },
          ],
          steps: [
            {
              step: 1,
              description: "Find workload for each time range",
              calculation: "For each range: SUM(workloadByRange[timeRange].totalWorkloadMinutes)",
              result: `${data.workloadByRange.map((r) => `${r.timeRange}: ${r.totalWorkloadMinutes}`).join(", ")}`,
            },
            {
              step: 2,
              description: "Find maximum",
              calculation: "MAX(lunch, dinner)",
              result: data.kpis.peakTimeRange,
            },
          ],
        };

      case "Avg Workers/Hour":
        return {
          kpiName: "Average Workers Per Hour",
          kpiValue: data.kpis.averageWorkersPerHour,
          dataSource: baseDataSource,
          formula: "SUM(workloadByHour[].activeWorkers) / hoursWithData",
          inputs: [
            {
              label: "Total Active Workers",
              value: data.workloadByHour.reduce((sum, h) => sum + h.activeWorkers, 0),
              source: "Sum of activeWorkers from workloadByHour",
            },
            {
              label: "Hours With Data",
              value: data.workloadByHour.length,
              source: "workloadByHour array length",
            },
          ],
          steps: [
            {
              step: 1,
              description: "Sum active workers across all hours",
              calculation: "SUM(workloadByHour[].activeWorkers)",
              result: data.workloadByHour.reduce((sum, h) => sum + h.activeWorkers, 0),
            },
            {
              step: 2,
              description: "Calculate average",
              calculation: `${data.workloadByHour.reduce((sum, h) => sum + h.activeWorkers, 0)} / ${data.workloadByHour.length}`,
              result: data.kpis.averageWorkersPerHour,
            },
          ],
        };

      default:
        return null;
    }
  };

  const chartConfig = {
    orders: {
      label: "Orders",
      color: "hsl(var(--chart-1))",
    },
    prepTime: {
      label: "Prep Time (min)",
      color: "hsl(var(--chart-2))",
    },
    cookTime: {
      label: "Cook Time (min)",
      color: "hsl(var(--chart-3))",
    },
    itemsPrepared: {
      label: "Items Prepared",
      color: "hsl(var(--chart-4))",
    },
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
        <div className="space-y-4">
          <EitjeDataFilters
            selectedYear={viewModel.selectedYear}
            selectedMonth={viewModel.selectedMonth}
            selectedDay={viewModel.selectedDay}
            selectedLocation={viewModel.selectedLocation || "all"}
            selectedDatePreset={viewModel.selectedDatePreset as any}
            onYearChange={viewModel.setSelectedYear}
            onMonthChange={(month) => viewModel.setSelectedMonth(month)}
            onDayChange={viewModel.setSelectedDay}
            onLocationChange={(loc) => viewModel.setSelectedLocation(loc === "all" ? null : loc)}
            onDatePresetChange={(preset) => viewModel.setSelectedDatePreset(preset)}
            locations={viewModel.locationOptions}
          />

          {/* Time Range Filter */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Time Range</span>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "all", label: "All Day" },
                { value: "lunch", label: "Lunch (11-16)" },
                { value: "afternoon-drinks", label: "Afternoon Drinks (16-18)" },
                { value: "dinner", label: "Dinner (18-22)" },
                { value: "after-drinks", label: "After Drinks (22-03)" },
              ].map((range) => (
                <Button
                  key={range.value}
                  variant="outline"
                  size="sm"
                  className={`border rounded-sm ${
                    viewModel.selectedTimeRange === range.value
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                  }`}
                  onClick={() => viewModel.setSelectedTimeRange(range.value as TimeRangeFilter)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Workload Thresholds */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Workload Thresholds (minutes)</span>
            <div className="flex gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Low</label>
                <Input
                  type="number"
                  step="0.5"
                  value={viewModel.workloadThresholds.low}
                  onChange={(e) => viewModel.setWorkloadLow(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Medium</label>
                <Input
                  type="number"
                  step="0.5"
                  value={viewModel.workloadThresholds.mid}
                  onChange={(e) => viewModel.setWorkloadMid(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">High</label>
                <Input
                  type="number"
                  step="0.5"
                  value={viewModel.workloadThresholds.high}
                  onChange={(e) => viewModel.setWorkloadHigh(parseFloat(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>
          </div>
          
          {/* Worker Filter */}
          <div className="flex gap-4 items-end">
            <AutocompleteSearch
              options={viewModel.workerOptions.map(o => ({
                value: o.value,
                label: o.label,
                userId: parseInt(o.value) || 0,
              }))}
              value={viewModel.selectedWorker || "all"}
              onValueChange={(value) => viewModel.setSelectedWorker(value === "all" ? null : value)}
              placeholder="Select worker to analyze..."
              label="Kitchen Worker"
              emptyMessage="No workers found."
              filterFn={(option, search) => {
                const searchLower = search.toLowerCase();
                return option.label.toLowerCase().includes(searchLower) || 
                       String(option.userId || '').includes(searchLower);
              }}
              className="min-w-[250px]"
            />
          </div>
        </div>

        {/* Loading State */}
        {viewModel.isLoading && <LoadingState />}

        {/* Error State */}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading keuken analyses data" />
        )}

        {/* KPIs and Charts */}
        {!viewModel.isLoading && !viewModel.error && viewModel.keukenAnalysesData && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products Produced</CardTitle>
                  <div className="flex items-center gap-2">
                    {viewModel.keukenAnalysesData && getCalculationBreakdown("Products Produced", viewModel.keukenAnalysesData) && (
                      <CalculationBreakdown {...getCalculationBreakdown("Products Produced", viewModel.keukenAnalysesData)!} />
                    )}
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(viewModel.keukenAnalysesData.kpis.totalProductsProduced)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total items produced
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Workload</CardTitle>
                  <div className="flex items-center gap-2">
                    {viewModel.keukenAnalysesData && getCalculationBreakdown("Workload", viewModel.keukenAnalysesData) && (
                      <CalculationBreakdown {...getCalculationBreakdown("Workload", viewModel.keukenAnalysesData)!} />
                    )}
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(viewModel.keukenAnalysesData.kpis.totalWorkloadMinutes, 0)} min
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total workload minutes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg/Hour</CardTitle>
                  <div className="flex items-center gap-2">
                    {viewModel.keukenAnalysesData && getCalculationBreakdown("Avg/Hour", viewModel.keukenAnalysesData) && (
                      <CalculationBreakdown {...getCalculationBreakdown("Avg/Hour", viewModel.keukenAnalysesData)!} />
                    )}
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(viewModel.keukenAnalysesData.kpis.averageWorkloadPerHour, 1)} min
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average per hour
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Peak Time</CardTitle>
                  <div className="flex items-center gap-2">
                    {viewModel.keukenAnalysesData && getCalculationBreakdown("Peak Time", viewModel.keukenAnalysesData) && (
                      <CalculationBreakdown {...getCalculationBreakdown("Peak Time", viewModel.keukenAnalysesData)!} />
                    )}
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {viewModel.keukenAnalysesData.kpis.peakTimeRange}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Busiest period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Workers/Hour</CardTitle>
                  <div className="flex items-center gap-2">
                    {viewModel.keukenAnalysesData && getCalculationBreakdown("Avg Workers/Hour", viewModel.keukenAnalysesData) && (
                      <CalculationBreakdown {...getCalculationBreakdown("Avg Workers/Hour", viewModel.keukenAnalysesData)!} />
                    )}
                    <ChefHat className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(viewModel.keukenAnalysesData.kpis.averageWorkersPerHour, 1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average staff
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Orders (Bar Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Orders per Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={viewModel.keukenAnalysesData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatNumber(value)}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString();
                            }}
                          />
                        }
                      />
                      <ChartLegend />
                      <Bar
                        dataKey="orders"
                        fill={chartConfig.orders.color}
                        name={chartConfig.orders.label}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Prep Time vs Cook Time (Line Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Prep Time vs Cook Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={viewModel.keukenAnalysesData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tickFormatter={(value) => `${value} min`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatNumber(value, 1) + " min"}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString();
                            }}
                          />
                        }
                      />
                      <ChartLegend />
                      <Line
                        type="monotone"
                        dataKey="prepTime"
                        stroke={chartConfig.prepTime.color}
                        strokeWidth={2}
                        dot={false}
                        name={chartConfig.prepTime.label}
                      />
                      <Line
                        type="monotone"
                        dataKey="cookTime"
                        stroke={chartConfig.cookTime.color}
                        strokeWidth={2}
                        dot={false}
                        name={chartConfig.cookTime.label}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Items Prepared (Bar Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Items Prepared per Day</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={viewModel.keukenAnalysesData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatNumber(value)}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString();
                            }}
                          />
                        }
                      />
                      <ChartLegend />
                      <Bar
                        dataKey="itemsPrepared"
                        fill={chartConfig.itemsPrepared.color}
                        name={chartConfig.itemsPrepared.label}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

