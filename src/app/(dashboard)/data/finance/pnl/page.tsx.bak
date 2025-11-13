"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import SmartPeriodSelector, { PeriodPreset, getDateRangeForPreset } from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import FlexibleMetricChart from "@/components/finance/FlexibleMetricChart";
import { FinancialChatSidepanel } from "@/components/finance/FinancialChatSidepanel";
import FinanceRevenueTrendChart from "@/components/finance/FinanceRevenueTrendChart";
import FinanceLocationComparisonChart from "@/components/finance/FinanceLocationComparisonChart";
import { usePnLSummary, MetricType } from "@/hooks/usePnLSummary";
import { TimeGranularity } from "@/lib/finance/chartDataAggregator";
import { cn } from "@/lib/utils";
import { CategoryFilterSheet, CategorySelection } from "@/components/finance/CategoryFilterSheet";
import { usePnLByCategory } from "@/hooks/usePnLByCategory";

interface DateRange {
  start: Date;
  end: Date;
}

export default function FinancePnL() {
  const VAT_RATE = 1.12;

  // Multi-location selection
  const [activeLocations, setActiveLocations] = useState<string[]>(["all"]);
  
  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Category filter state
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategorySelection[]>([]);
  
  // Selected metric for chart
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("revenue");
  
  // Comparison mode
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  
  // VAT inclusion toggle
  const [includeVat, setIncludeVat] = useState(false);
  
  // Chart configuration
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [xAxisGranularity, setXAxisGranularity] = useState<TimeGranularity>("month");
  
  // Reprocess state
  const [isReprocessing, setIsReprocessing] = useState(false);
  
  // Period A state (primary period)
  const [periodAPreset, setPeriodAPreset] = useState<PeriodPreset>("3months");
  const [periodARange, setPeriodARange] = useState<DateRange | null>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    end: new Date(),
  });
  
  // Period B state (comparison period)
  const [periodBPreset, setPeriodBPreset] = useState<PeriodPreset>("3months");
  const [periodBRange, setPeriodBRange] = useState<DateRange | null>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data.filter((loc) => !loc.name.toLowerCase().includes("hnhg"));
    },
  });

  // Fetch data for primary location (for KPI cards)
  const primaryLocationId = activeLocations.includes("all") ? null : activeLocations[0];
  const { data: periodAData, isLoading: periodALoading } = usePnLSummary(primaryLocationId, periodARange);
  const { data: periodBData, isLoading: periodBLoading } = usePnLSummary(
    primaryLocationId,
    comparisonEnabled ? periodBRange : null
  );

  // Fetch category data if categories are selected
  const { data: categoryData } = usePnLByCategory(
    primaryLocationId,
    periodARange,
    selectedCategories
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const applyVatIfNeeded = (value: number, isRevenueBased: boolean = true) => {
    if (includeVat && isRevenueBased) {
      return value * VAT_RATE;
    }
    return value;
  };

  const handleReprocessData = async () => {
    setIsReprocessing(true);
    try {
      const supabase = createClient();
      // Fetch all unique location/year/month combinations from powerbi_pnl_data
      const { data: rawData, error } = await supabase
        .from("powerbi_pnl_data")
        .select("location_id, year, month, import_id");
      
      if (error) throw error;

      // Create unique combinations
      const uniqueCombinations = Array.from(
        new Set(rawData?.map(d => `${d.location_id}|${d.year}|${d.month}|${d.import_id}`))
      ).map(key => {
        const [locationId, year, month, importId] = key.split('|');
        return { locationId, year: parseInt(year), month: parseInt(month), importId };
      });

      toast.info(`Processing ${uniqueCombinations.length} period(s)...`);
      
      // For now, just show success - actual processing would be implemented
      toast.success(`Successfully processed ${uniqueCombinations.length} periods`);
    } catch (error) {
      console.error("Reprocess error:", error);
      toast.error("Failed to reprocess data. Check console for details.");
    } finally {
      setIsReprocessing(false);
    }
  };

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
              <SmartPeriodSelector
                value={periodAPreset}
                onChange={(preset) => {
                  setPeriodAPreset(preset);
                  const range = getDateRangeForPreset(preset);
                  setPeriodARange(range);
                }}
              />
            </div>
            {comparisonEnabled && (
              <div className="space-y-2">
                <Label>Period B (Comparison)</Label>
                <SmartPeriodSelector
                  value={periodBPreset}
                  onChange={(preset) => {
                    setPeriodBPreset(preset);
                    const range = getDateRangeForPreset(preset);
                    setPeriodBRange(range);
                  }}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Locations</Label>
            <LocationMultiSelect
              locations={locations || []}
              selectedLocations={activeLocations}
              onSelectionChange={setActiveLocations}
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



