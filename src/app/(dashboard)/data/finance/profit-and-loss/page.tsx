/**
 * Profit & Loss View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import SmartPeriodSelector from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import FlexibleMetricChart from "@/components/finance/FlexibleMetricChart";
import { FinancialChatSidepanel } from "@/components/finance/FinancialChatSidepanel";
import FinanceRevenueTrendChart from "@/components/finance/FinanceRevenueTrendChart";
import FinanceLocationComparisonChart from "@/components/finance/FinanceLocationComparisonChart";
import { CategoryFilterSheet, CategorySelection } from "@/components/finance/CategoryFilterSheet";
import { useProfitAndLossViewModel } from "@/viewmodels/finance/useProfitAndLossViewModel";
import { MetricType } from "@/models/finance/profit-and-loss.model";
import { TimeGranularity } from "@/lib/finance/chartDataAggregator";
import { cn } from "@/lib/utils";

export default function FinancePnL() {
  const {
    // State
    activeLocations,
    setActiveLocations,
    isChatOpen,
    setIsChatOpen,
    isCategoryFilterOpen,
    setIsCategoryFilterOpen,
    selectedCategories,
    setSelectedCategories,
    selectedMetric,
    setSelectedMetric,
    comparisonEnabled,
    setComparisonEnabled,
    includeVat,
    setIncludeVat,
    chartType,
    setChartType,
    xAxisGranularity,
    setXAxisGranularity,
    isReprocessing,
    periodAPreset,
    periodARange,
    periodBPreset,
    periodBRange,
    // Data
    locations,
    periodAData,
    periodALoading,
    periodBData,
    periodBLoading,
    categoryData,
    // Utilities
    formatCurrency,
    formatPercent,
    calculatePercentChange,
    applyVatIfNeeded,
    // Handlers
    handlePeriodAChange,
    handlePeriodBChange,
    handleReprocessData,
    metricCards,
  } = useProfitAndLossViewModel();

  return (
    <div className={cn(
      "w-full p-6 space-y-6 transition-all duration-300",
      isCategoryFilterOpen && "mr-[500px] sm:mr-[540px]"
    )}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background pb-4 border-b -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Profit & Loss</h1>
            <p className="text-muted-foreground">Financial performance overview</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCategoryFilterOpen(true)}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Category Filters {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </Button>
            <Button
              onClick={handleReprocessData}
              disabled={isReprocessing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isReprocessing && "animate-spin")} />
              Reprocess Data
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selection & Location Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Period & Location Selection</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-vat"
                  checked={includeVat}
                  onCheckedChange={setIncludeVat}
                />
                <Label htmlFor="include-vat" className="text-sm">
                  Include VAT
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="comparison-mode"
                  checked={comparisonEnabled}
                  onCheckedChange={setComparisonEnabled}
                />
                <Label htmlFor="comparison-mode" className="text-sm">
                  Comparison Mode
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Period A (Primary)</Label>
              <SmartPeriodSelector value={periodAPreset} onChange={handlePeriodAChange} />
            </div>
            {comparisonEnabled && (
              <div className="space-y-2">
                <Label>Period B (Comparison)</Label>
                <SmartPeriodSelector value={periodBPreset} onChange={handlePeriodBChange} />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Locations</Label>
            <LocationMultiSelect
              locations={locations || []}
              activeLocations={activeLocations}
              onChange={setActiveLocations}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      {periodAData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {metricCards.map(({ metric, title }) => {
            const periodAValue = periodAData[metric] || 0;
            const periodBValue = comparisonEnabled && periodBData ? (periodBData[metric] || 0) : null;
            const percentChange = periodBValue !== null ? calculatePercentChange(periodAValue, periodBValue) : null;
            const displayValue = applyVatIfNeeded(periodAValue, metric === "revenue" || metric === "gross_profit");

            return (
              <RevenueKpiCard
                key={metric}
                title={title}
                value={displayValue}
                isLoading={periodALoading}
                comparisonValue={periodBValue !== null ? applyVatIfNeeded(periodBValue, metric === "revenue" || metric === "gross_profit") : undefined}
                percentChange={percentChange !== null ? percentChange : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Charts */}
      <Tabs defaultValue="trend" className="w-full">
        <TabsList>
          <TabsTrigger value="trend">Revenue Trend</TabsTrigger>
          <TabsTrigger value="location">Location Comparison</TabsTrigger>
          <TabsTrigger value="metric">Metric Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceRevenueTrendChart
                locationIds={activeLocations.includes("all") ? null : activeLocations}
                dateRange={periodARange}
                includeVat={includeVat}
                comparisonRange={comparisonEnabled ? periodBRange : null}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <FinanceLocationComparisonChart
                locationIds={activeLocations.includes("all") ? null : activeLocations}
                dateRange={periodARange}
                includeVat={includeVat}
                metric={selectedMetric}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metric" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Metric Analysis</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="metric-select" className="text-sm">Metric:</Label>
                    <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
                      <SelectTrigger id="metric-select" className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="gross_profit">Gross Profit</SelectItem>
                        <SelectItem value="ebitda">EBITDA</SelectItem>
                        <SelectItem value="labor_cost">Labor Cost</SelectItem>
                        <SelectItem value="other_costs">Other Costs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="chart-type" className="text-sm">Chart Type:</Label>
                    <Select value={chartType} onValueChange={(value) => setChartType(value as "line" | "bar")}>
                      <SelectTrigger id="chart-type" className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="granularity" className="text-sm">Granularity:</Label>
                    <Select value={xAxisGranularity} onValueChange={(value) => setXAxisGranularity(value as TimeGranularity)}>
                      <SelectTrigger id="granularity" className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="quarter">Quarter</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FlexibleMetricChart
                locationIds={activeLocations.includes("all") ? null : activeLocations}
                dateRange={periodARange}
                metric={selectedMetric}
                chartType={chartType}
                granularity={xAxisGranularity}
                includeVat={includeVat}
                comparisonRange={comparisonEnabled ? periodBRange : null}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Filter Sheet */}
      <CategoryFilterSheet
        open={isCategoryFilterOpen}
        onOpenChange={setIsCategoryFilterOpen}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        categoryData={categoryData}
      />

      {/* Financial Chat Sidepanel */}
      <FinancialChatSidepanel
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
        locationIds={activeLocations.includes("all") ? null : activeLocations}
        dateRange={periodARange}
      />
    </div>
  );
}

