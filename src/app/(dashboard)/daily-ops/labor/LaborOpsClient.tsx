/**
 * Labor Ops Client Component
 * Interactive UI for Daily Ops Labor page with KPIs and charts
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { useLaborOpsViewModel } from "@/viewmodels/daily-ops/useLaborOpsViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { DollarSign, Users, Clock, TrendingUp, Percent, Zap } from "lucide-react";

interface LaborOpsClientProps {
  initialData?: any;
}

export function LaborOpsClient({ initialData }: LaborOpsClientProps) {
  const viewModel = useLaborOpsViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  const chartConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-1))",
    },
    laborCost: {
      label: "Labor Cost",
      color: "hsl(var(--chart-2))",
    },
    hours: {
      label: "Hours",
      color: "hsl(var(--chart-3))",
    },
    laborCostPercentage: {
      label: "Labor Cost %",
      color: "hsl(var(--chart-4))",
    },
    revenuePerHour: {
      label: "Revenue/Hour",
      color: "hsl(var(--chart-5))",
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

        {/* Loading State */}
        {viewModel.isLoading && <LoadingState />}

        {/* Error State */}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading labor ops data" />
        )}

        {/* KPIs and Charts */}
        {!viewModel.isLoading && !viewModel.error && viewModel.laborOpsData && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(viewModel.laborOpsData.kpis.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg: {formatCurrency(viewModel.laborOpsData.kpis.averageRevenuePerDay)}/day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(viewModel.laborOpsData.kpis.totalLaborCost)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(viewModel.laborOpsData.kpis.laborCostPercentage, 1)}% of revenue
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatNumber(viewModel.laborOpsData.kpis.totalHours, 1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg: {formatNumber(viewModel.laborOpsData.kpis.averageHoursPerDay, 1)}/day
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue/Hour</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(viewModel.laborOpsData.kpis.revenuePerHour)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Productivity metric
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Revenue vs Labor Cost (Line Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Labor Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart
                      data={viewModel.laborOpsData.chartData}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatCurrency(value)}
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
                        dataKey="revenue"
                        stroke={chartConfig.revenue.color}
                        strokeWidth={2}
                        dot={false}
                        name={chartConfig.revenue.label}
                      />
                      <Line
                        type="monotone"
                        dataKey="laborCost"
                        stroke={chartConfig.laborCost.color}
                        strokeWidth={2}
                        dot={false}
                        name={chartConfig.laborCost.label}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Hours Worked (Bar Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Hours Worked</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart
                      data={viewModel.laborOpsData.chartData}
                    >
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
                            formatter={(value: any) => formatNumber(value, 1) + "h"}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString();
                            }}
                          />
                        }
                      />
                      <ChartLegend />
                      <Bar
                        dataKey="hours"
                        fill={chartConfig.hours.color}
                        name={chartConfig.hours.label}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Labor Cost Percentage (Line Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Labor Cost Percentage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart
                      data={viewModel.laborOpsData.chartData}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatNumber(value, 1) + "%"}
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
                        dataKey="laborCostPercentage"
                        stroke={chartConfig.laborCostPercentage.color}
                        strokeWidth={2}
                        dot={false}
                        name={chartConfig.laborCostPercentage.label}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Revenue Per Hour (Bar Chart) */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Per Hour</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart
                      data={viewModel.laborOpsData.chartData}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                      />
                      <YAxis tickFormatter={(value) => `€${(value / 100).toFixed(0)}`} />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => formatCurrency(value)}
                            labelFormatter={(value) => {
                              const date = new Date(value);
                              return date.toLocaleDateString();
                            }}
                          />
                        }
                      />
                      <ChartLegend />
                      <Bar
                        dataKey="revenuePerHour"
                        fill={chartConfig.revenuePerHour.color}
                        name={chartConfig.revenuePerHour.label}
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

