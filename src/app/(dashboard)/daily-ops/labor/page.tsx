/**
 * Daily Ops Labor View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Target,
  BarChart3,
  Calendar as CalendarIcon,
  Download
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLaborViewModel } from "@/viewmodels/daily-ops/useLaborViewModel";

interface LaborKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

function LaborKpiCard({ title, value, subtitle, trend, isLoading, icon }: LaborKpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <div className="flex items-center text-xs text-muted-foreground">
            {trend === "up" && <TrendingUp className="h-3 w-3 mr-1 text-green-500" />}
            {trend === "down" && <TrendingUp className="h-3 w-3 mr-1 text-red-500 rotate-180" />}
            {trend === "neutral" && <Activity className="h-3 w-3 mr-1 text-gray-500" />}
            <span>{subtitle}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LaborPage() {
  const {
    selectedLocation,
    dateRange,
    showComparison,
    setSelectedLocation,
    setDateRange,
    setShowComparison,
    locations,
    laborData,
    isLoading: laborLoading,
    formatCurrency,
    formatHours,
    formatPercentage,
  } = useLaborViewModel();

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Labor Analytics</h1>
          <p className="text-muted-foreground">Labor performance and productivity analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
              <label className="text-sm font-medium">Date Range</label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="comparison-mode"
                checked={showComparison}
                onCheckedChange={setShowComparison}
              />
              <Label htmlFor="comparison-mode" className="cursor-pointer">
                Show comparison
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LaborKpiCard
          title="Total Hours"
          value={laborData ? formatHours(laborData.totalHours) : "0h"}
          subtitle="This period"
          trend="up"
          isLoading={laborLoading}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <LaborKpiCard
          title="Labor Cost"
          value={laborData ? formatCurrency(laborData.totalCost) : "€0"}
          subtitle="Total cost"
          trend="neutral"
          isLoading={laborLoading}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <LaborKpiCard
          title="Revenue per Hour"
          value={laborData ? formatCurrency(laborData.totalRevenue / laborData.totalHours) : "€0"}
          subtitle="Productivity metric"
          trend="up"
          isLoading={laborLoading}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <LaborKpiCard
          title="Productivity"
          value={laborData ? laborData.productivity.toFixed(2) : "0.00"}
          subtitle="Revenue per hour"
          trend="up"
          isLoading={laborLoading}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Additional KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <LaborKpiCard
          title="Avg Rate"
          value={laborData ? formatCurrency(laborData.avgRate) : "€0"}
          subtitle="Per hour"
          trend="neutral"
          isLoading={laborLoading}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <LaborKpiCard
          title="Efficiency"
          value={laborData ? formatPercentage(laborData.efficiency) : "0%"}
          subtitle="Performance"
          trend="up"
          isLoading={laborLoading}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
        />
        <LaborKpiCard
          title="Peak Hours"
          value={laborData ? `${laborData.peakHours}:00` : "0:00"}
          subtitle="Busiest time"
          trend="neutral"
          isLoading={laborLoading}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <LaborKpiCard
          title="Active Staff"
          value={laborData ? laborData.activeStaff : 0}
          subtitle="Current team"
          trend="neutral"
          isLoading={laborLoading}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hourly Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Hourly productivity chart will be implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Productivity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Shift productivity breakdown will be implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Labor Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Labor Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p>Labor comparison chart will be implemented</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Department Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Kitchen</h4>
                <p className="text-2xl font-bold">8 staff</p>
                <p className="text-sm text-muted-foreground">€12,400 cost</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Service</h4>
                <p className="text-2xl font-bold">4 staff</p>
                <p className="text-sm text-muted-foreground">€6,200 cost</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Management</h4>
                <p className="text-2xl font-bold">2 staff</p>
                <p className="text-sm text-muted-foreground">€3,000 cost</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
