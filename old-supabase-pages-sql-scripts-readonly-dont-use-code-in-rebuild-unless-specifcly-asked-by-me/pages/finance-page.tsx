/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/page.tsx
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Upload, Sparkles, FileText, TrendingUp, TrendingDown, Users, Clock, Award } from "lucide-react";
import Link from "next/link";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import { RevenueTrendChart } from "@/components/finance/RevenueTrendChart";
import { SalesIntelligenceCard } from "@/components/finance/SalesIntelligenceCard";
import { useFinanceDashboardViewModel } from "@/viewmodels/finance/useDashboardViewModel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FinanceDashboard() {
  const {
    period,
    currentDate,
    comparisonCount,
    selectedLocation,
    locations,
    revenueData,
    salesData,
    revenueLoading,
    salesLoading,
    periodLabel,
    setPeriod,
    setCurrentDate,
    setComparisonCount,
    setSelectedLocation,
    formatCurrency,
    formatPercent,
  } = useFinanceDashboardViewModel();

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Finance Department</h1>
          <p className="text-muted-foreground">Financial performance overview and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/settings/connections/data-import">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings/bork-api">
              <Sparkles className="h-4 w-4 mr-2" />
              Bork API
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {revenueLoading ? "..." : formatCurrency(revenueData?.totalRevenue || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {periodLabel} growth: {formatPercent(revenueData?.revenueGrowth || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Locations</p>
                <p className="text-2xl font-bold">{locations?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All locations operational
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Sources</p>
                <p className="text-2xl font-bold">2</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bork API + Manual imports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                <p className="text-2xl font-bold">2h</p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bork API automated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Period</label>
              <Select value={period} onValueChange={(value) => setPeriod(value as "day" | "week" | "month" | "quarter" | "year")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Location</label>
              <Select value={selectedLocation || "all"} onValueChange={(value) => setSelectedLocation(value === "all" ? null : value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Comparison Periods</label>
              <Select value={comparisonCount.toString()} onValueChange={(value) => setComparisonCount(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Period</SelectItem>
                  <SelectItem value="3">3 Periods</SelectItem>
                  <SelectItem value="6">6 Periods</SelectItem>
                  <SelectItem value="12">12 Periods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <PeriodSelector
            period={period}
            currentDate={currentDate}
            onPeriodChange={setPeriod}
            onDateChange={setCurrentDate}
          />
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="intelligence">Sales Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full justify-start">
                  <Link href="/finance/pnl">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View P&L Analysis
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/finance/sales">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Sales Performance
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/finance/labor">
                    <Users className="h-4 w-4 mr-2" />
                    Labor Analytics
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/finance/analytics">
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Analytics
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Bork API Sync</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Data Import</p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Report Generated</p>
                      <p className="text-xs text-muted-foreground">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueKpiCard
              title="Total Revenue"
              value={revenueData?.totalRevenue || 0}
              previousValue={0}
              comparisonLabel=""
              isLoading={revenueLoading}
            />
            <RevenueKpiCard
              title="Growth Rate"
              value={revenueData?.revenueGrowth || 0}
              previousValue={0}
              comparisonLabel=""
              isLoading={revenueLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueTrendChart
                data={revenueData?.dailyBreakdown || []}
                isLoading={revenueLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesIntelligenceCard
              title="Top Products"
              data={salesData?.topProducts || []}
              isLoading={salesLoading}
            />
            <SalesIntelligenceCard
              title="Top Categories"
              data={salesData?.topCategories || []}
              isLoading={salesLoading}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}