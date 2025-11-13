/**
 * Finance Daily Ops Dashboard View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, TrendingUp, DollarSign, Target, AlertTriangle, CheckCircle, BarChart3, PieChart } from "lucide-react";
import { useDailyOpsDashboardViewModel } from "@/viewmodels/finance/useDailyOpsDashboardViewModel";
import type { LocationKey, DateRangeKey } from "@/models/finance/daily-ops-dashboard.model";

export default function DailyOpsDashboard() {
  const {
    // State
    selectedLocation,
    setSelectedLocation,
    selectedDateRange,
    setSelectedDateRange,

    // Data
    kpiData,
    isLoading,

    // Constants
    LOCATIONS,
    DATE_RANGES,
  } = useDailyOpsDashboardViewModel();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Ops Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights for labor and sales performance
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(DATE_RANGES).map(([key, range]) => (
            <Button
              key={key}
              variant={selectedDateRange === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDateRange(key as DateRangeKey)}
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
              onClick={() => setSelectedLocation(key as LocationKey)}
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

          {/* Detailed KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Labor KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Labor Performance
                </CardTitle>
                <CardDescription>Workforce efficiency and productivity metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Hours per Worker</p>
                    <p className="text-2xl font-bold">{kpiData.labor.avgHoursPerWorker.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Labor Cost</p>
                    <p className="text-2xl font-bold">€{kpiData.labor.laborCost.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Team Performance</p>
                  <div className="space-y-2">
                    {kpiData.labor.teams.map((team) => (
                      <div key={team.teamId} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{team.teamName}</span>
                        <div className="flex gap-4 text-sm">
                          <span>{team.workers} workers</span>
                          <span>{team.hours.toFixed(1)}h</span>
                          <Badge variant="secondary">{team.productivity.toFixed(1)}h/worker</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Sales Performance
                </CardTitle>
                <CardDescription>Revenue and transaction insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                    <p className="text-2xl font-bold">€{kpiData.sales.avgTransactionValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sales per Hour</p>
                    <p className="text-2xl font-bold">€{kpiData.combined.salesProductivity.toFixed(0)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Top Products</p>
                  <div className="space-y-2">
                    {kpiData.sales.topProducts.map((product, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{product.product}</span>
                        <div className="flex gap-4 text-sm">
                          <span>€{product.revenue.toFixed(0)}</span>
                          <span>{product.transactions} sales</span>
                          <Badge variant="outline">€{product.avgPrice.toFixed(2)} avg</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Combinations */}
          <Card>
            <CardHeader>
              <CardTitle>Top Product Combinations</CardTitle>
              <CardDescription>Best performing product pairings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpiData.sales.topCombinations.map((combo, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{combo.combination}</h4>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>€{combo.revenue.toFixed(0)} revenue</p>
                      <p>{combo.frequency} orders</p>
                      <p>€{(combo.revenue / combo.frequency).toFixed(2)} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Labor Efficiency</p>
                    <p className="text-2xl font-bold">{kpiData.combined.laborEfficiency.toFixed(1)}x</p>
                    <p className="text-xs text-muted-foreground">Revenue per labor cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Productivity Score</p>
                    <p className="text-2xl font-bold">{((kpiData.combined.salesProductivity / 100) * 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Sales per hour worked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Workload</p>
                    <p className="text-2xl font-bold">{kpiData.labor.avgHoursPerWorker > 8 ? "High" : kpiData.labor.avgHoursPerWorker > 6 ? "Medium" : "Low"}</p>
                    <p className="text-xs text-muted-foreground">Based on avg hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Hourly Performance
                </CardTitle>
                <CardDescription>Revenue and labor by hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpiData.sales.hourlyBreakdown.slice(12, 24).map((hour) => {
                    const maxRevenue = Math.max(...kpiData.sales.hourlyBreakdown.map(h => h.revenue));
                    return (
                      <div key={hour.hour} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-medium">{hour.hour}:00</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Revenue: €{hour.revenue.toFixed(0)}</span>
                            <span>Transactions: {hour.transactions}</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.min((hour.revenue / maxRevenue) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Weekly Sales Trend
                </CardTitle>
                <CardDescription>Revenue distribution by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {kpiData.sales.weeklyTrend.map((day) => {
                    const maxRevenue = Math.max(...kpiData.sales.weeklyTrend.map(d => d.revenue));
                    return (
                      <div key={day.day} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-medium">{day.day}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>€{day.revenue.toFixed(0)}</span>
                            <span>{day.transactions} transactions</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ width: `${(day.revenue / maxRevenue) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Management Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Management Insights</CardTitle>
              <CardDescription>Key recommendations based on current performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-green-600 mb-2">✅ Strengths</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• High labor efficiency at {kpiData.combined.laborEfficiency.toFixed(1)}x return</li>
                    <li>• Strong revenue per worker: €{kpiData.combined.revenuePerWorker.toFixed(0)}</li>
                    <li>• Healthy profit margin of {kpiData.combined.profitMargin.toFixed(1)}%</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-orange-600 mb-2">⚠️ Areas for Improvement</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {kpiData.labor.avgHoursPerWorker > 8 && <li>• Consider hiring more staff - high workload detected</li>}
                    {kpiData.combined.salesProductivity < 50 && <li>• Focus on sales training and efficiency</li>}
                    <li>• Monitor peak hours for optimal staffing</li>
                    <li>• Consider cross-training for better flexibility</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for the selected period</p>
        </div>
      )}
    </div>
  );
}
