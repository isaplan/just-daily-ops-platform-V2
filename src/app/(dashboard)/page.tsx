"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, TrendingUp, DollarSign, Target } from "lucide-react";
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// Location mapping
const LOCATIONS = {
  total: { id: "total", name: "Total", color: "bg-blue-500" },
  kinsbergen: { id: "1125", name: "Van Kinsbergen", color: "bg-green-500" },
  barbea: { id: "1711", name: "Bar Bea", color: "bg-purple-500" },
  lamour: { id: "2499", name: "L'Amour Toujours", color: "bg-orange-500" }
};

// Date range presets
const DATE_RANGES = {
  today: { label: "Today", getRange: () => ({ from: new Date(), to: new Date() }) },
  yesterday: { label: "Yesterday", getRange: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  thisWeek: { label: "This Week", getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
  lastWeek: { label: "Last Week", getRange: () => ({ from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7)) }) },
  thisMonth: { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  lastMonth: { label: "Last Month", getRange: () => ({ from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) }) }
};

interface LaborData {
  totalHours: number;
  totalWorkers: number;
  avgHoursPerWorker: number;
  laborCost: number;
  productivity: number;
}

interface SalesData {
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
}

interface KPIData {
  labor: LaborData;
  sales: SalesData;
  combined: {
    revenuePerWorker: number;
    salesProductivity: number;
    laborEfficiency: number;
    profitMargin: number;
  };
}

export default function HomePage() {
  const [selectedLocation, setSelectedLocation] = useState<keyof typeof LOCATIONS>("total");
  const [selectedDateRange, setSelectedDateRange] = useState<keyof typeof DATE_RANGES>("today");
  const [dateRange, setDateRange] = useState(DATE_RANGES.today.getRange());

  // Update date range when preset changes
  useEffect(() => {
    setDateRange(DATE_RANGES[selectedDateRange].getRange());
  }, [selectedDateRange]);

  // Fetch labor data
  const { data: laborData, isLoading: laborLoading } = useQuery({
    queryKey: ["labor-kpis", selectedLocation, dateRange],
    queryFn: async (): Promise<LaborData> => {
      const response = await fetch(`/api/raw-data?table=eitje_labor_hours_aggregated&limit=1000`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch labor data');
      }
      
      let records = result.data || [];
      
      // Filter by date range
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      records = records.filter((r: { date: string }) => r.date >= startDate && r.date <= endDate);
      
      // Filter by location if not total
      if (selectedLocation !== "total") {
        records = records.filter((r: { environment_id: number }) => r.environment_id === parseInt(LOCATIONS[selectedLocation].id));
      }

      // Calculate labor KPIs
      const totalHours = records?.reduce((sum: number, r: { total_hours_worked?: number }) => sum + (r.total_hours_worked || 0), 0) || 0;
      const totalWorkers = records?.reduce((sum: number, r: { employee_count?: number }) => sum + (r.employee_count || 0), 0) || 0;
      const laborCost = records?.reduce((sum: number, r: { total_wage_cost?: number }) => sum + (r.total_wage_cost || 0), 0) || 0;

      return {
        totalHours,
        totalWorkers,
        avgHoursPerWorker: totalWorkers > 0 ? totalHours / totalWorkers : 0,
        laborCost,
        productivity: totalWorkers > 0 ? totalHours / totalWorkers : 0
      };
    }
  });

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-kpis", selectedLocation, dateRange],
    queryFn: async (): Promise<SalesData> => {
      const response = await fetch(`/api/raw-data?table=eitje_revenue_days_aggregated&limit=1000`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sales data');
      }
      
      let records = result.data || [];
      
      // Filter by date range
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      records = records.filter((r: { date: string }) => r.date >= startDate && r.date <= endDate);
      
      // Filter by location if not total
      if (selectedLocation !== "total") {
        records = records.filter((r: { environment_id: number }) => r.environment_id === parseInt(LOCATIONS[selectedLocation].id));
      }

      const totalRevenue = records?.reduce((sum: number, r: { total_revenue?: number }) => sum + (r.total_revenue || 0), 0) || 0;
      const totalTransactions = records?.reduce((sum: number, r: { transaction_count?: number }) => sum + (r.transaction_count || 0), 0) || 0;

      return {
        totalRevenue,
        totalTransactions,
        avgTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
      };
    }
  });

  // Calculate combined KPIs
  const kpiData: KPIData | null = laborData && salesData ? {
    labor: laborData,
    sales: salesData,
    combined: {
      revenuePerWorker: laborData.totalWorkers > 0 ? salesData.totalRevenue / laborData.totalWorkers : 0,
      salesProductivity: laborData.totalHours > 0 ? salesData.totalRevenue / laborData.totalHours : 0,
      laborEfficiency: laborData.laborCost > 0 ? salesData.totalRevenue / laborData.laborCost : 0,
      profitMargin: salesData.totalRevenue > 0 ? ((salesData.totalRevenue - laborData.laborCost) / salesData.totalRevenue) * 100 : 0
    }
  } : null;

  const isLoading = laborLoading || salesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Operations KPIs</h1>
          <p className="text-muted-foreground">
            Real-time key performance indicators for daily operations
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(DATE_RANGES).map(([key, range]) => (
            <Button
              key={key}
              variant={selectedDateRange === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDateRange(key as keyof typeof DATE_RANGES)}
            >
              {range.label}
            </Button>
          ))}
        </div>

        {/* Location Tabs */}
        <div className="flex gap-2">
          {Object.entries(LOCATIONS).map(([key, location]) => (
            <Button
              key={key}
              variant={selectedLocation === key ? "default" : "outline"}
              onClick={() => setSelectedLocation(key as keyof typeof LOCATIONS)}
              className="flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded-full ${location.color}`} />
              {location.name}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : kpiData ? (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpiData.sales.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {kpiData.sales.totalTransactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.labor.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  {kpiData.labor.totalWorkers} workers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue per Worker</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpiData.combined.revenuePerWorker.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">
                  Per worker efficiency
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.combined.profitMargin.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  After labor costs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Transaction Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpiData.sales.avgTransactionValue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Per transaction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours per Worker</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.labor.avgHoursPerWorker.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  Per worker
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales per Hour</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpiData.combined.salesProductivity.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">
                  Revenue per hour worked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Efficiency</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.combined.laborEfficiency.toFixed(1)}x</div>
                <p className="text-xs text-muted-foreground">
                  Revenue per labor cost
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for the selected period</p>
        </div>
      )}
    </div>
  );
}

