/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/finance/daily-ops
 */

/**
 * Finance Daily Ops Insights View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  PieChart,
  Zap,
  Eye,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { useDailyOpsInsightsViewModel } from "@/viewmodels/finance/useDailyOpsInsightsViewModel";
import type { LocationKey, TimePeriodKey } from "@/models/finance/daily-ops-insights.model";

export default function WeNeverKnewThisPage() {
  const {
    // State
    selectedLocation,
    setSelectedLocation,
    selectedPeriod,
    setSelectedPeriod,
    compareWithPrevious,
    setCompareWithPrevious,

    // Data
    analysis,
    isLoading,

    // Constants
    LOCATIONS,
    TIME_PERIODS,
  } = useDailyOpsInsightsViewModel();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No Data Available</h3>
        <p className="text-muted-foreground">Unable to analyze the selected period. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            We Never Knew This
          </h1>
          <p className="text-muted-foreground">Hidden insights from cross-correlating your data sources</p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Location Selector */}
          <div>
            <h3 className="text-sm font-medium mb-2">Location</h3>
            <div className="flex gap-2">
              {Object.entries(LOCATIONS).map(([key, location]) => (
                <Button
                  key={key}
                  variant={selectedLocation === key ? "default" : "outline"}
                  onClick={() => setSelectedLocation(key as LocationKey)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${location.color}`}></div>
                  {location.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Period Selector */}
          <div>
            <h3 className="text-sm font-medium mb-2">Time Period</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TIME_PERIODS).map(([key, period]) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? "default" : "outline"}
                  onClick={() => setSelectedPeriod(key as TimePeriodKey)}
                  className="text-sm"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Comparison Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="compare-previous"
              checked={compareWithPrevious}
              onChange={(e) => setCompareWithPrevious(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="compare-previous" className="text-sm font-medium">
              Compare with previous period
            </label>
          </div>
        </div>
      </div>

      {/* Period Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {analysis.current.period} Cross-Correlated Overview
          </CardTitle>
          <CardDescription>
            What the data reveals when connected across {analysis.current.dataPoints} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Total Revenue</span>
                {compareWithPrevious && analysis.previous && (
                  <Badge variant={analysis.comparison.revenueChange >= 0 ? "default" : "destructive"}>
                    {analysis.comparison.revenueChange >= 0 ? "+" : ""}{analysis.comparison.revenueChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">€{analysis.current.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">€{analysis.current.avgDailyRevenue.toFixed(0)}/day avg</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Hours Worked</span>
                {compareWithPrevious && analysis.previous && (
                  <Badge variant={analysis.comparison.hoursChange >= 0 ? "default" : "destructive"}>
                    {analysis.comparison.hoursChange >= 0 ? "+" : ""}{analysis.comparison.hoursChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{analysis.current.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">{analysis.current.avgDailyHours.toFixed(1)}h/day avg</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Employees</span>
              </div>
              <p className="text-2xl font-bold">{analysis.current.totalEmployees}</p>
              <p className="text-xs text-muted-foreground">Total staff</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Revenue/Hour</span>
                {compareWithPrevious && analysis.previous && (
                  <Badge variant={analysis.comparison.efficiencyChange >= 0 ? "default" : "destructive"}>
                    {analysis.comparison.efficiencyChange >= 0 ? "+" : ""}{analysis.comparison.efficiencyChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">€{analysis.current.avgRevenuePerHour.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Efficiency metric</p>
            </div>
          </div>

          {/* Comparison Section */}
          {compareWithPrevious && analysis.previous && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">Period Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">Previous Period</h5>
                  <p className="text-sm">{analysis.previous.period}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">Revenue: €{analysis.previous.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm">Hours: {analysis.previous.totalHours.toFixed(1)}h</p>
                    <p className="text-sm">Efficiency: €{analysis.previous.avgRevenuePerHour.toFixed(2)}/h</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">Current Period</h5>
                  <p className="text-sm">{analysis.current.period}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">Revenue: €{analysis.current.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm">Hours: {analysis.current.totalHours.toFixed(1)}h</p>
                    <p className="text-sm">Efficiency: €{analysis.current.avgRevenuePerHour.toFixed(2)}/h</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomalies & Surprises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Anomalies & Surprises
          </CardTitle>
          <CardDescription>Unexpected patterns that stand out when data is cross-correlated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.current.anomalies.length > 0 ? (
              analysis.current.anomalies.map((insight) => (
                <div key={insight.id} className="p-4 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-red-900">{insight.title}</h4>
                      <p className="text-sm text-red-700">{insight.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{insight.type}</Badge>
                        <span className="text-xs text-red-600">Impact: {insight.impact}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-900">{insight.data.value}</p>
                      <p className="text-xs text-red-600">{insight.data.metric}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p>No anomalies detected - everything looks normal!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Hidden Opportunities
          </CardTitle>
          <CardDescription>Insights that could improve performance when data is connected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.current.opportunities.length > 0 ? (
              analysis.current.opportunities.map((insight) => (
                <div key={insight.id} className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-yellow-900">{insight.title}</h4>
                      <p className="text-sm text-yellow-700">{insight.description}</p>
                      <p className="text-sm font-medium text-yellow-800">{insight.recommendation}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{insight.type}</Badge>
                        <span className="text-xs text-yellow-600">Impact: {insight.impact}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-900">{insight.data.value}</p>
                      <p className="text-xs text-yellow-600">{insight.data.metric}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <p>No specific opportunities identified for this period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Correlations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Data Correlations
          </CardTitle>
          <CardDescription>How different metrics influence each other when cross-analyzed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.current.correlations.map((insight) => (
              <div key={insight.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-medium">Correlation:</span> {insight.correlation.factor1} ↔ {insight.correlation.factor2}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Strength:</span> {(insight.correlation.strength * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{insight.type}</Badge>
                      <span className="text-xs text-muted-foreground">Location: {insight.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{insight.data.value}</p>
                    <p className="text-xs text-muted-foreground">{insight.data.metric}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {insight.data.trend === 'up' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : insight.data.trend === 'down' ? (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-xs">{insight.data.change}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
