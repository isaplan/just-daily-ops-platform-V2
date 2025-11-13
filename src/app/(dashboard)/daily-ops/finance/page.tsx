/**
 * Daily Ops Finance View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import FlexibleMetricChart from "@/components/finance/FlexibleMetricChart";
import { Loader2, TrendingUp, TrendingDown, ChevronDown, X } from "lucide-react";
import { useFinanceViewModel } from "@/viewmodels/daily-ops/useFinanceViewModel";
import { usePageFilters } from "@/contexts/page-filters-context";

export default function DailyOpsFinancePage() {
  // Local state for compare mode and multi-location
  const [compareMode, setCompareMode] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["all"]);

  const { registerFilters, clearFilters: clearPageFilters, isFilterOpen, setIsFilterOpen } = usePageFilters();
  const filterCardRef = useRef<HTMLDivElement>(null);

  const {
    // State
    selectedYear,
    selectedMonth,
    selectedLocation,
    selectedMetric,
    chartType,
    xAxisGranularity,
    availableMonths,
    
    // Setters
    setSelectedYear,
    setSelectedMonth,
    setSelectedLocation,
    setSelectedMetric,
    setChartType,
    setXAxisGranularity,
    
    // Constants
    months: MONTHS,
    locations: LOCATIONS,
    currentYear,
    
    // Data
    isLoading,
    error,
    
    // KPIs
    revenueKpi,
    costOfSalesKpi,
    laborKpi,
    otherCostsKpi,
    resultaatKpi,
    grossProfitKpi,
    ebitdaKpi,
    grossMarginKpi,
    laborCostPercentageKpi,
    
    // Chart data
    chartDateRange,
    
    // Utilities
    formatCurrency,
    getMostRecentMonth,
    getMonthName,
    clearFilters,
  } = useFinanceViewModel();

  const mostRecentMonth = getMostRecentMonth();

  // Handle location toggle for compare mode
  const handleLocationToggle = useCallback((locationId: string) => {
    if (!compareMode) {
      setSelectedLocation(locationId);
      return;
    }

    setSelectedLocations(prev => {
      if (locationId === "all") {
        return ["all"];
      }
      if (prev.includes(locationId)) {
        const filtered = prev.filter(id => id !== locationId);
        return filtered.length === 0 ? ["all"] : filtered;
      }
      // Remove "all" if selecting specific locations
      const withoutAll = prev.filter(id => id !== "all");
      return [...withoutAll, locationId];
    });
  }, [compareMode, setSelectedLocation]);

  // Get active locations for chart
  const activeLocationsForChart = compareMode ? selectedLocations : [selectedLocation];

  // Get location names helper function
  const getLocationName = useCallback((locationId: string) => {
    return LOCATIONS.find(loc => loc.value === locationId)?.label || locationId;
  }, [LOCATIONS]);

  // Handle filter removal
  const handleFilterRemove = useCallback((key: string) => {
    switch (key) {
      case "year":
        setSelectedYear(currentYear);
        break;
      case "month":
        setSelectedMonth(null);
        break;
      case "location":
        setSelectedLocation("all");
        if (compareMode) {
          setSelectedLocations(["all"]);
        }
        break;
      case "compareMode":
        setCompareMode(false);
        setSelectedLocations(["all"]);
        break;
    }
  }, [currentYear, setSelectedYear, setSelectedMonth, setSelectedLocation, compareMode]);

  // Register filters with context
  useEffect(() => {

    const filterLabels = [
      {
        key: "year",
        label: "Year",
        value: selectedYear,
      },
      {
        key: "month",
        label: "Month",
        value: selectedMonth !== null ? MONTHS.find(m => m.value === selectedMonth)?.label || "All" : "All",
      },
      {
        key: "location",
        label: "Location",
        value: selectedLocation === "all" ? "All Locations" : getLocationName(selectedLocation),
      },
      {
        key: "compareMode",
        label: "Compare Mode",
        value: compareMode ? "Enabled" : "Disabled",
      },
    ];

    // Extract filter component
    const filterComponent = (
      <Card className="border-0 shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Filters</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="compare-mode-nav" className="cursor-pointer text-xs">
                Vergelijken
              </Label>
              <Switch
                id="compare-mode-nav"
                checked={compareMode}
                onCheckedChange={(checked) => {
                  setCompareMode(checked);
                  if (checked) {
                    setSelectedLocations([selectedLocation]);
                  } else {
                    setSelectedLocation(selectedLocations[0] || "all");
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {/* Year Buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Jaar</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedYear === 2024 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(2024)}
                className="text-xs"
              >
                2024
              </Button>
              <Button
                variant={selectedYear === 2025 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(2025)}
                className="text-xs"
              >
                2025
              </Button>
            </div>
          </div>

          {/* Month Buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Maand</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedMonth === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(null)}
                className="text-xs"
              >
                Alle maanden
              </Button>
              {MONTHS.map((month) => {
                const hasData = availableMonths.includes(month.value);
                return (
                  <Button
                    key={month.value}
                    variant={selectedMonth === month.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMonth(month.value)}
                    disabled={!hasData}
                    className={`text-xs ${!hasData ? "opacity-50" : ""}`}
                  >
                    {month.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Location Buttons */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Locatie</Label>
            <div className="flex gap-2 flex-wrap">
              {LOCATIONS.map((location) => {
                const isSelected = compareMode
                  ? selectedLocations.includes(location.value)
                  : selectedLocation === location.value;
                return (
                  <Button
                    key={location.value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLocationToggle(location.value)}
                    disabled={compareMode && location.value === "all"}
                    className="text-xs"
                  >
                    {location.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearFilters();
                setCompareMode(false);
                setSelectedLocations(["all"]);
              }}
              className="text-xs"
            >
              Wissen
            </Button>
          </div>
        </CardContent>
      </Card>
    );

    registerFilters({
      labels: filterLabels,
      filterComponent,
      onFilterRemove: handleFilterRemove,
      filterCardRef,
    });

    // Cleanup: clear filters when component unmounts
    return () => {
      clearPageFilters();
    };
  }, [
    selectedYear,
    selectedMonth,
    selectedLocation,
    compareMode,
    availableMonths,
    MONTHS,
    LOCATIONS,
    getLocationName,
    registerFilters,
    clearPageFilters,
    clearFilters,
    handleLocationToggle,
    handleFilterRemove,
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Finance Dashboard</h1>
        <p className="text-muted-foreground">
          Last month vs 6-month average for all main COGS categories
        </p>
      </div>

      {/* Filters */}
      <Card ref={filterCardRef}>
        {!isFilterOpen ? (
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filters</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2"
              >
                Open Filters
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        ) : (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filters</CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="compare-mode" className="cursor-pointer text-sm">
                    Vergelijken
                  </Label>
                  <Switch
                    id="compare-mode"
                    checked={compareMode}
                    onCheckedChange={(checked) => {
                      setCompareMode(checked);
                      if (checked) {
                        setSelectedLocations([selectedLocation]);
                      } else {
                        setSelectedLocation(selectedLocations[0] || "all");
                      }
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Active filter labels - shown in filter card when open */}
              {(() => {
                const activeFilterLabels = [
                  {
                    key: "year",
                    label: "Year",
                    value: selectedYear,
                  },
                  {
                    key: "month",
                    label: "Month",
                    value: selectedMonth !== null ? MONTHS.find(m => m.value === selectedMonth)?.label || "All" : "All",
                  },
                  {
                    key: "location",
                    label: "Location",
                    value: selectedLocation === "all" ? "All Locations" : getLocationName(selectedLocation),
                  },
                  {
                    key: "compareMode",
                    label: "Compare Mode",
                    value: compareMode ? "Enabled" : "Disabled",
                  },
                ].filter(
                  (filter) => filter.value !== null && filter.value !== "" && filter.value !== "all" && filter.value !== "All" && filter.value !== "Disabled"
                );

                return activeFilterLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pb-4 border-b">
                    {activeFilterLabels.map((filter) => (
                      <div
                        key={filter.key}
                        className="bg-muted px-2 py-1 rounded text-xs flex items-center gap-1.5"
                      >
                        <span className="font-medium">{filter.label}:</span>
                        <span>{String(filter.value)}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-3 w-3 p-0 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleFilterRemove(filter.key)}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
          {/* Year Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Jaar</Label>
            <div className="flex gap-2">
              <Button
                variant={selectedYear === 2024 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(2024)}
              >
                2024
              </Button>
              <Button
                variant={selectedYear === 2025 ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedYear(2025)}
              >
                2025
              </Button>
            </div>
          </div>

          {/* Month Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Maand</Label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedMonth === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth(null)}
              >
                Alle maanden
              </Button>
              {MONTHS.map((month) => {
                const hasData = availableMonths.includes(month.value);
                return (
                  <Button
                    key={month.value}
                    variant={selectedMonth === month.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMonth(month.value)}
                    disabled={!hasData}
                    className={!hasData ? "opacity-50" : ""}
                  >
                    {month.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Location Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Locatie</Label>
            <div className="flex gap-2 flex-wrap">
              {LOCATIONS.map((location) => {
                const isSelected = compareMode
                  ? selectedLocations.includes(location.value)
                  : selectedLocation === location.value;
                return (
                  <Button
                    key={location.value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLocationToggle(location.value)}
                    disabled={compareMode && location.value === "all"}
                  >
                    {location.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Clear Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearFilters();
                setCompareMode(false);
                setSelectedLocations(["all"]);
              }}
            >
              Wissen
            </Button>
          </div>
        </CardContent>
          </>
        )}
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-red-500">
              Failed to load dashboard data
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {/* Revenue - Netto-omzet groepen */}
          <div
            onClick={() => setSelectedMetric("revenue")}
            className={`cursor-pointer p-3 rounded-lg border transition-all ${
              selectedMetric === "revenue" ? "ring-2 ring-primary border-primary" : "border-border bg-card"
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">Netto-omzet</div>
            <div className="text-xl font-bold">{formatCurrency(revenueKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Gross Profit - Bruto Winst */}
          <div
            onClick={() => setSelectedMetric("gross_profit")}
            className={`cursor-pointer p-3 rounded-lg border transition-all ${
              selectedMetric === "gross_profit" ? "ring-2 ring-primary border-primary" : "border-border bg-card"
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">Bruto Winst</div>
            <div className="text-xl font-bold">{formatCurrency(grossProfitKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* EBITDA */}
          <div
            onClick={() => setSelectedMetric("ebitda")}
            className={`cursor-pointer p-3 rounded-lg border transition-all ${
              selectedMetric === "ebitda" ? "ring-2 ring-primary border-primary" : "border-border bg-card"
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">EBITDA</div>
            <div className="text-xl font-bold">{formatCurrency(ebitdaKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Gross Margin % - Bruto Marge % */}
          <div className="p-3 rounded-lg border border-border bg-card">
            <div className="text-xs font-medium text-muted-foreground mb-1">Bruto Marge %</div>
            <div className="text-xl font-bold">{grossMarginKpi?.lastMonth.toFixed(1) || 0}%</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Cost of Sales - Kostprijs van de omzet */}
          <div className="p-3 rounded-lg border border-border bg-card">
            <div className="text-xs font-medium text-muted-foreground mb-1">Kostprijs van de omzet</div>
            <div className="text-xl font-bold">{formatCurrency(costOfSalesKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Labor Costs - Arbeidskosten */}
          <div
            onClick={() => setSelectedMetric("labor_cost")}
            className={`cursor-pointer p-3 rounded-lg border transition-all ${
              selectedMetric === "labor_cost" ? "ring-2 ring-primary border-primary" : "border-border bg-card"
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">Arbeidskosten</div>
            <div className="text-xl font-bold">{formatCurrency(laborKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Labor Cost % - Arbeidskosten % */}
          <div className="p-3 rounded-lg border border-border bg-card">
            <div className="text-xs font-medium text-muted-foreground mb-1">Arbeidskosten %</div>
            <div className="text-xl font-bold">{laborCostPercentageKpi?.lastMonth.toFixed(1) || 0}%</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Other Costs - Overige bedrijfskosten */}
          <div
            onClick={() => setSelectedMetric("other_costs")}
            className={`cursor-pointer p-3 rounded-lg border transition-all ${
              selectedMetric === "other_costs" ? "ring-2 ring-primary border-primary" : "border-border bg-card"
            }`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">Overige bedrijfskosten</div>
            <div className="text-xl font-bold">{formatCurrency(otherCostsKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>

          {/* Resultaat - Profit/Loss */}
          <div className="p-3 rounded-lg border border-border bg-card">
            <div className="text-xs font-medium text-muted-foreground mb-1">Resultaat</div>
            <div className="text-xl font-bold">{formatCurrency(resultaatKpi?.lastMonth || 0)}</div>
            {compareMode && selectedLocations.length > 1 && (
              <div className="text-xs text-muted-foreground mt-1">
                {selectedLocations.map(id => getLocationName(id)).join(" vs ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Controls */}
      {!isLoading && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-center flex-wrap">
              <Label>Grafiek Type:</Label>
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
              >
                Lijngrafiek
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                Staafdiagram
              </Button>
              
              <div className="ml-auto flex items-center gap-2">
                <Label>Granulariteit:</Label>
                <Select value={xAxisGranularity} onValueChange={(v) => setXAxisGranularity(v as typeof xAxisGranularity)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Maandelijks</SelectItem>
                    <SelectItem value="quarter">Per kwartaal</SelectItem>
                    <SelectItem value="year">Jaarlijks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {!isLoading && !error && (
        <FlexibleMetricChart
          selectedMetric={selectedMetric}
          activeLocations={activeLocationsForChart}
          dateRange={chartDateRange}
          comparisonDateRange={null}
          comparisonEnabled={false}
          chartType={chartType}
          xAxisGranularity={xAxisGranularity}
          includeVat={false}
          vatRate={1.12}
          selectedCategories={[]}
          categoryData={[]}
        />
      )}

      {/* Summary Card */}
      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {mostRecentMonth.month > 0 ? (
                <>
                  {selectedMonth !== null ? (
                    <>Comparing {getMonthName(selectedMonth)} {selectedYear} against the average of the 6 months prior</>
                  ) : (
                    <>Comparing {getMonthName(mostRecentMonth.month)} {mostRecentMonth.year} against the average of the 6 months prior</>
                  )}
                </>
              ) : (
                <>No data available</>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
