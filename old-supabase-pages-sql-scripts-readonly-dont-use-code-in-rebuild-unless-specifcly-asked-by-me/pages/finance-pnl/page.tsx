/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/pnl
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw, Filter } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import SmartPeriodSelector from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import FlexibleMetricChart from "@/components/finance/FlexibleMetricChart";
import { FinancialChatSidepanel } from "@/components/finance/FinancialChatSidepanel";
import FinanceRevenueTrendChart from "@/components/finance/FinanceRevenueTrendChart";
import FinanceLocationComparisonChart from "@/components/finance/FinanceLocationComparisonChart";
import { CategoryFilterSheet, CategorySelection } from "@/components/finance/CategoryFilterSheet";
import { usePnLViewModel } from "@/viewmodels/finance/usePnLViewModel";
import { TimeGranularity } from "@/lib/finance/chartDataAggregator";
import { cn } from "@/lib/utils";
import type { MetricType } from "@/models/finance/pnl.model";

export default function FinancePnL() {
  const {
    activeLocations,
    isChatOpen,
    isCategoryFilterOpen,
    selectedCategories,
    selectedMetric,
    comparisonEnabled,
    includeVat,
    chartType,
    xAxisGranularity,
    isReprocessing,
    periodAPreset,
    periodARange,
    periodBPreset,
    periodBRange,
    locations,
    periodAData,
    periodBData,
    categoryData,
    periodALoading,
    periodBLoading,
    isLoading,
    setActiveLocations,
    setIsChatOpen,
    setIsCategoryFilterOpen,
    setSelectedCategories,
    setSelectedMetric,
    setComparisonEnabled,
    setIncludeVat,
    setChartType,
    setXAxisGranularity,
    handlePeriodAChange,
    handlePeriodBChange,
    handleReprocessData,
    formatCurrency,
    applyVatIfNeeded,
    VAT_RATE,
  } = usePnLViewModel();

  const metricCards: Array<{ metric: MetricType; title: string }> = [
    { metric: "revenue", title: "Total Revenue" },
    { metric: "gross_profit", title: "Gross Profit" },
    { metric: "ebitda", title: "EBITDA" },
    { metric: "labor_cost", title: "Labor Cost" },
    { metric: "other_costs", title: "Other Costs" },
  ];

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
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-vat"
                  checked={includeVat}
                  onCheckedChange={setIncludeVat}
                />
                <Label htmlFor="include-vat" className="cursor-pointer">
                  Include VAT ({((VAT_RATE - 1) * 100).toFixed(0)}%)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="comparison-mode"
                  checked={comparisonEnabled}
                  onCheckedChange={setComparisonEnabled}
                />
                <Label htmlFor="comparison-mode" className="cursor-pointer">
                  Enable Comparison
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={comparisonEnabled ? "grid grid-cols-2 gap-6" : ""}>
            <SmartPeriodSelector
              label="Period A"
              value={periodAPreset}
              onChange={handlePeriodAChange}
              customRange={periodARange || undefined}
            />
            
            {comparisonEnabled && (
              <SmartPeriodSelector
                label="Period B"
                value={periodBPreset}
                onChange={handlePeriodBChange}
                customRange={periodBRange || undefined}
              />
            )}
          </div>

          {/* Location Multi-Select */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Active Locations for Comparison</Label>
            <LocationMultiSelect
              locations={locations || []}
              activeLocations={activeLocations}
              onChange={setActiveLocations}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map(({ metric, title }) => {
          const isRevenueBased = ['revenue', 'gross_profit', 'ebitda'].includes(metric);
          const currentValue = applyVatIfNeeded(periodAData?.[metric] || 0, isRevenueBased);
          const comparisonValue = applyVatIfNeeded(periodBData?.[metric] || 0, isRevenueBased);

          return (
            <div
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={cn(
                "cursor-pointer transition-all",
                selectedMetric === metric && "ring-2 ring-primary rounded-lg"
              )}
            >
              <RevenueKpiCard
                title={`${title}${includeVat && isRevenueBased ? ' (incl. VAT)' : ''}`}
                value={currentValue}
                previousValue={comparisonEnabled ? comparisonValue : 0}
                comparisonLabel={comparisonEnabled ? "vs Period B" : ""}
                isLoading={periodALoading || (comparisonEnabled && periodBLoading)}
              />
            </div>
          );
        })}
      </div>

      {/* Chart Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center flex-wrap">
            <Label>Chart Type:</Label>
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
            >
              Line Chart
            </Button>
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
            >
              Bar Chart
            </Button>
            
            <div className="ml-auto flex items-center gap-2">
              <Label>X-Axis Granularity:</Label>
              <Select value={xAxisGranularity} onValueChange={(v) => setXAxisGranularity(v as TimeGranularity)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Metric Chart */}
      <FlexibleMetricChart
        selectedMetric={selectedMetric}
        activeLocations={activeLocations}
        dateRange={periodARange}
        comparisonDateRange={comparisonEnabled ? periodBRange : null}
        comparisonEnabled={comparisonEnabled}
        chartType={chartType}
        xAxisGranularity={xAxisGranularity}
        includeVat={includeVat}
        vatRate={VAT_RATE}
        selectedCategories={selectedCategories}
        categoryData={categoryData}
      />

      {/* AI Chat Card */}
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsChatOpen(true)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Financial Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            Open Financial Chat
          </Button>
        </CardContent>
      </Card>

      <FinancialChatSidepanel
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        locationId={primaryLocationId}
        month=""
      />

      <CategoryFilterSheet
        open={isCategoryFilterOpen}
        onOpenChange={setIsCategoryFilterOpen}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />

      <Tabs defaultValue="labor">
        <TabsList>
          <TabsTrigger value="labor">Labor Efficiency</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          {activeLocations.includes("all") && <TabsTrigger value="comparison">Location Comparison</TabsTrigger>}
        </TabsList>

        <TabsContent value="labor">
          <Card>
            <CardHeader>
              <CardTitle>Labor Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeLocations.includes("all") && activeLocations.length === 1 ? (
                <div className="h-[300px]">
                  <FinanceRevenueTrendChart locationKey={activeLocations[0]} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a single location to view labor trends</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeLocations.includes("all") && activeLocations.length === 1 ? (
                <div className="h-[400px]">
                  <FinanceRevenueTrendChart locationKey={activeLocations[0]} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a single location to view trends</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {activeLocations.includes("all") && (
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Location Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <FinanceLocationComparisonChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}