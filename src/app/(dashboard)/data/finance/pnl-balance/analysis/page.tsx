/**
 * PNL Balance Analysis View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import { usePnLBalanceAnalysisViewModel } from "@/viewmodels/finance/usePnLBalanceAnalysisViewModel";
import { ComparisonItem, HierarchyNode, MappingReportItem } from "@/models/finance/pnl-balance-analysis.model";

export default function PnLBalanceAnalysisPage() {
  const {
    selectedLocation,
    setSelectedLocation,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    expandedHierarchy,
    toggleHierarchy,
    locations,
    comparisonData,
    comparisonLoading,
    refetchComparison,
    hierarchyData,
    hierarchyLoading,
    refetchHierarchy,
    formatCurrency,
    formatNumber,
    availableYears,
    availableMonths,
  } = usePnLBalanceAnalysisViewModel();

  const comparison: ComparisonItem[] = comparisonData?.comparison || [];
  const hierarchy: HierarchyNode[] = hierarchyData?.hierarchy || [];
  const mappingReport: MappingReportItem[] = hierarchyData?.mappingReport || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">PNL Balance Analysis</h1>
        <div className="flex gap-2">
          <Button onClick={() => refetchComparison()} variant="outline" size="sm">
            Refresh Comparison
          </Button>
          <Button onClick={() => refetchHierarchy()} variant="outline" size="sm">
            Refresh Hierarchy
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(selectedYear, m - 1).toLocaleString("nl-NL", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accountant vs Calculated COGS Comparison</CardTitle>
          {comparisonData?.summary && (
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span>Total Categories: {comparisonData.summary.totalCategories}</span>
              <span className="text-green-600">
                Matching: {comparisonData.summary.matchingCategories}
              </span>
              <span className="text-red-600">
                Differences: {comparisonData.summary.categoriesWithDifferences}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {comparisonLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comparison.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No comparison data available for the selected criteria.</AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Accountant Value</TableHead>
                  <TableHead className="text-right">Calculated Value</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">% Difference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((item) => (
                  <TableRow key={item.key}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.accountantValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.calculatedValue)}</TableCell>
                    <TableCell className={`text-right ${Math.abs(item.difference) > 0.01 ? 'text-red-600 font-semibold' : ''}`}>
                      {formatCurrency(item.difference)}
                    </TableCell>
                    <TableCell className={`text-right ${Math.abs(item.percentageDifference) > 0.1 ? 'text-red-600 font-semibold' : ''}`}>
                      {formatNumber(item.percentageDifference)}%
                    </TableCell>
                    <TableCell>
                      {item.isMatch ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Match
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Mismatch
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* COGS Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle>Complete COGS Hierarchy (MAIN → SUB → SUB-SUB)</CardTitle>
          {hierarchyData?.summary && (
            <div className="flex gap-4 text-sm text-muted-foreground mt-2">
              <span>Main Categories: {hierarchyData.summary.totalMainCategories}</span>
              <span>Sub Categories: {hierarchyData.summary.totalSubCategories}</span>
              <span>Sub-Sub Categories: {hierarchyData.summary.totalSubSubCategories}</span>
              <span>Total Amount: {formatCurrency(hierarchyData.summary.totalAmount)}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {hierarchyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : hierarchy.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>No hierarchy data available for the selected criteria.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {hierarchy.map((main, mainIdx) => {
                const mainKey = `main-${mainIdx}`;
                const isMainExpanded = expandedHierarchy.has(mainKey);
                
                return (
                  <div key={mainKey} className="border rounded-lg p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleHierarchy(mainKey)}
                    >
                      <div className="flex items-center gap-2">
                        {isMainExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold text-lg">{main.main}</span>
                        <Badge variant="outline">{main.subs.length} subs</Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(main.totalAmount)}</div>
                        <div className="text-xs text-muted-foreground">{main.recordCount} records</div>
                      </div>
                    </div>
                    
                    {isMainExpanded && (
                      <div className="mt-4 ml-6 space-y-3">
                        {main.subs.map((sub, subIdx) => {
                          const subKey = `${mainKey}-sub-${subIdx}`;
                          const isSubExpanded = expandedHierarchy.has(subKey);
                          
                          return (
                            <div key={subKey} className="border-l-2 pl-4">
                              <div 
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleHierarchy(subKey)}
                              >
                                <div className="flex items-center gap-2">
                                  {isSubExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <span className="font-medium">{sub.sub}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {sub.subSubs.length} GL accounts
                                  </Badge>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">{formatCurrency(sub.totalAmount)}</div>
                                  <div className="text-xs text-muted-foreground">{sub.recordCount} records</div>
                                </div>
                              </div>
                              
                              {isSubExpanded && (
                                <div className="mt-2 ml-6 space-y-1">
                                  {sub.subSubs.map((subSub, subSubIdx) => (
                                    <div key={subSubIdx} className="flex items-center justify-between text-sm py-1 border-l pl-3">
                                      <span className="text-muted-foreground">{subSub.glAccount}</span>
                                      <div className="text-right">
                                        <span className="font-medium">{formatCurrency(subSub.amount)}</span>
                                        <span className="text-xs text-muted-foreground ml-2">
                                          ({subSub.recordCount} records)
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapping Report */}
      {mappingReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accountant Structure Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mappingReport.map((mapping, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{mapping.accountantCategory}</h3>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(mapping.totalAmount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {mapping.totalRecords} records, {mapping.matchCount} matches
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    Expected Categories: {mapping.expectedCategories.join(', ')}
                  </div>
                  {mapping.matchedMainCategories.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Matched Main Categories: </span>
                      {mapping.matchedMainCategories.map((cat, i) => (
                        <Badge key={i} variant="outline" className="mr-1">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

