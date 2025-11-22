/**
 * Categories Products Aggregated Sales - Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { CategoryProductFilter } from "@/components/view-data/CategoryProductFilter";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCategoriesProductsViewModel, TimePeriod } from "@/viewmodels/sales/useCategoriesProductsViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { ProductAggregate, CategoryAggregate, TimePeriodTotals, MainCategoryAggregate } from "@/models/sales/categories-products.model";
import { formatCurrency, formatNumber } from "@/lib/utils";

// Helper to get totals for a specific time period
function getPeriodTotals(
  data: CategoryAggregate | ProductAggregate,
  period: TimePeriod
): TimePeriodTotals {
  switch (period) {
    case "daily":
      return data.daily;
    case "weekly":
      return data.weekly;
    case "monthly":
      return data.monthly;
    default:
      return data.daily;
  }
}

interface WorkloadBadgeProps {
  level: 'low' | 'mid' | 'high';
  minutes?: number;
  onUpdate: (level: 'low' | 'mid' | 'high', minutes: number) => void;
}

function WorkloadBadge({ level, minutes, onUpdate }: WorkloadBadgeProps) {
  const getMinutesForLevel = (lvl: 'low' | 'mid' | 'high') => {
    switch (lvl) {
      case 'low': return 2.5;
      case 'mid': return 5;
      case 'high': return 10;
    }
  };

  const displayMinutes = minutes ?? getMinutesForLevel(level);
  
  const colorClass = {
    low: 'bg-green-100 text-green-800 hover:bg-green-200',
    mid: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    high: 'bg-red-100 text-red-800 hover:bg-red-200',
  }[level];

  return (
    <Select
      value={level}
      onValueChange={(newLevel: 'low' | 'mid' | 'high') => {
        const newMinutes = getMinutesForLevel(newLevel);
        onUpdate(newLevel, newMinutes);
      }}
    >
      <SelectTrigger className="w-36 h-7 border-0 p-0 bg-transparent hover:bg-transparent">
        <Badge className={`${colorClass} cursor-pointer border-0`}>
          {level.toUpperCase()} ({displayMinutes}m)
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low (2.5m)</SelectItem>
        <SelectItem value="mid">Mid (5m)</SelectItem>
        <SelectItem value="high">High (10m)</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface MEPBadgeProps {
  level: 'low' | 'mid' | 'high';
  minutes?: number;
  onUpdate: (level: 'low' | 'mid' | 'high', minutes: number) => void;
}

function MEPBadge({ level, minutes, onUpdate }: MEPBadgeProps) {
  const getMinutesForLevel = (lvl: 'low' | 'mid' | 'high') => {
    switch (lvl) {
      case 'low': return 1;
      case 'mid': return 2;
      case 'high': return 4;
    }
  };

  const displayMinutes = minutes ?? getMinutesForLevel(level);
  
  const colorClass = {
    low: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    mid: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    high: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  }[level];

  return (
    <Select
      value={level}
      onValueChange={(newLevel: 'low' | 'mid' | 'high') => {
        const newMinutes = getMinutesForLevel(newLevel);
        onUpdate(newLevel, newMinutes);
      }}
    >
      <SelectTrigger className="w-36 h-7 border-0 p-0 bg-transparent hover:bg-transparent">
        <Badge className={`${colorClass} cursor-pointer border-0`}>
          {level.toUpperCase()} ({displayMinutes}m MEP)
        </Badge>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low (1m)</SelectItem>
        <SelectItem value="mid">Mid (2m)</SelectItem>
        <SelectItem value="high">High (4m)</SelectItem>
      </SelectContent>
    </Select>
  );
}

interface AggregatedTableProps {
  categories: CategoryAggregate[];
  period: TimePeriod;
  onUpdateWorkload: (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => void;
  onUpdateMEP: (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => void;
}

function AggregatedTable({ categories, period, onUpdateWorkload, onUpdateMEP }: AggregatedTableProps) {
  if (!categories || categories.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
          No data available
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {categories.map((category) => {
        if (!category || !category.categoryName) return null;
        
        const categoryTotals = getPeriodTotals(category, period);
        const products = category.products || [];
        
        return (
          <React.Fragment key={category.categoryName}>
            {/* Category row */}
            <TableRow className="bg-gray-50 font-semibold">
              <TableCell className="font-semibold">{category.categoryName}</TableCell>
              <TableCell className="text-muted-foreground italic">Category Total</TableCell>
              <TableCell className="font-semibold">{formatNumber(categoryTotals.quantity, 0, false)}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(categoryTotals.revenueExVat)}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(categoryTotals.revenueIncVat)}</TableCell>
              <TableCell className="font-semibold">{categoryTotals.transactionCount}</TableCell>
              <TableCell></TableCell>
              <TableCell></TableCell>
            </TableRow>
            
            {/* Product rows */}
            {products.length > 0 ? (
              products.map((product) => {
                if (!product || !product.productName) return null;
                
                const productTotals = getPeriodTotals(product, period);
                
                return (
                  <TableRow key={`${category.categoryName}-${product.productName}`} className="hover:bg-gray-50">
                    <TableCell></TableCell>
                    <TableCell className="pl-8">{product.productName}</TableCell>
                    <TableCell>{formatNumber(productTotals.quantity, 0, false)}</TableCell>
                    <TableCell>{formatCurrency(productTotals.revenueExVat)}</TableCell>
                    <TableCell>{formatCurrency(productTotals.revenueIncVat)}</TableCell>
                    <TableCell>{productTotals.transactionCount}</TableCell>
                    <TableCell>
                      <WorkloadBadge
                        level={product.workloadLevel || 'mid'}
                        minutes={product.workloadMinutes}
                        onUpdate={(level, minutes) => onUpdateWorkload(product.productName, level, minutes)}
                      />
                    </TableCell>
                    <TableCell>
                      <MEPBadge
                        level={product.mepLevel || 'low'}
                        minutes={product.mepMinutes}
                        onUpdate={(level, minutes) => onUpdateMEP(product.productName, level, minutes)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-muted-foreground text-sm">
                  No products in this category
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

interface CategoriesProductsClientProps {
  initialData?: {
    aggregatedData?: any;
    locations?: any[];
  };
}

export function CategoriesProductsClient({ initialData }: CategoriesProductsClientProps) {
  const viewModel = useCategoriesProductsViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Combine categories and mainCategories into a single flat list
  const allCategories = React.useMemo(() => {
    if (!viewModel.aggregatedData) return [];
    
    const categories: CategoryAggregate[] = [];
    
    // Add categories from mainCategories (flatten the hierarchy)
    if (viewModel.aggregatedData.mainCategories) {
      for (const mainCat of viewModel.aggregatedData.mainCategories) {
        // Add each category within the main category
        if (mainCat.categories) {
          categories.push(...mainCat.categories);
        }
      }
    }
    
    // Add standalone categories (those without main category)
    if (viewModel.aggregatedData.categories) {
      categories.push(...viewModel.aggregatedData.categories);
    }
    
    return categories;
  }, [viewModel.aggregatedData]);

  // Get totals for the active period
  const grandTotals = viewModel.aggregatedData?.totals 
    ? getPeriodTotals(viewModel.aggregatedData.totals, viewModel.activeTimePeriod)
    : null;

  // Handle workload update
  const handleUpdateWorkload = async (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => {
    try {
      const response = await fetch('/api/products/update-workload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          workloadLevel: level,
          workloadMinutes: minutes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workload');
      }

      // Refresh the data
      viewModel.refetchData?.();
    } catch (error) {
      console.error('Error updating workload:', error);
      alert('Failed to update workload');
    }
  };

  // Handle MEP update
  const handleUpdateMEP = async (productName: string, level: 'low' | 'mid' | 'high', minutes: number) => {
    try {
      const response = await fetch('/api/products/update-mep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          mepLevel: level,
          mepMinutes: minutes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update MEP time');
      }

      // Refresh the data
      viewModel.refetchData?.();
    } catch (error) {
      console.error('Error updating MEP:', error);
      alert('Failed to update MEP time');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Title */}
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Filters */}
        <EitjeDataFilters
          selectedYear={viewModel.selectedYear}
          selectedMonth={viewModel.selectedMonth}
          selectedDay={viewModel.selectedDay}
          selectedLocation={viewModel.selectedLocation}
          selectedDatePreset={viewModel.selectedDatePreset}
          onYearChange={viewModel.setSelectedYear}
          onMonthChange={viewModel.setSelectedMonth}
          onDayChange={viewModel.setSelectedDay}
          onLocationChange={viewModel.setSelectedLocation}
          onDatePresetChange={viewModel.setSelectedDatePreset}
          locations={viewModel.locationOptions}
          disabled={!viewModel.isCurrentYear}
        />

        {/* Category & Product Filter - Always visible */}
        <CategoryProductFilter
          categoryOptions={viewModel.categoryOptions}
          selectedCategory={viewModel.selectedCategory}
          selectedProduct={viewModel.selectedProduct}
          onCategoryChange={viewModel.setSelectedCategory}
          onProductChange={viewModel.setSelectedProduct}
          expandedCategories={viewModel.expandedCategories}
          onToggleCategory={viewModel.toggleCategoryExpanded}
        />

        {/* Loading State */}
        {viewModel.isLoading && <LoadingState />}

        {/* Error State */}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading aggregated data" />
        )}

        {/* Aggregated Data Table - Always show, even if no data */}
        {!viewModel.isLoading && !viewModel.error && (
          <div className="space-y-4">
            {/* Grand Totals Summary */}
            {grandTotals && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-2">Grand Totals ({viewModel.activeTimePeriod})</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Quantity: </span>
                    <span className="font-semibold">{formatNumber(grandTotals.quantity, 0, false)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue Ex VAT: </span>
                    <span className="font-semibold">{formatCurrency(grandTotals.revenueExVat)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue Inc VAT: </span>
                    <span className="font-semibold">{formatCurrency(grandTotals.revenueIncVat)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transactions: </span>
                    <span className="font-semibold">{grandTotals.transactionCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for Daily/Weekly/Monthly */}
            <Tabs 
              value={viewModel.activeTimePeriod} 
              onValueChange={(value) => viewModel.setActiveTimePeriod(value as TimePeriod)}
            >
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>

              <TabsContent value="daily">
                <UITable stickyHeader={true}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">Quantity</TableHead>
                      <TableHead className="font-semibold">Revenue Ex VAT</TableHead>
                      <TableHead className="font-semibold">Revenue Inc VAT</TableHead>
                      <TableHead className="font-semibold">Transactions</TableHead>
                      <TableHead className="font-semibold">Workload</TableHead>
                      <TableHead className="font-semibold">MEP Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCategories.length > 0 ? (
                      <AggregatedTable 
                        categories={allCategories} 
                        period="daily"
                        onUpdateWorkload={handleUpdateWorkload}
                        onUpdateMEP={handleUpdateMEP}
                      />
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data available. Please select a date range to view aggregated totals.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </UITable>
              </TabsContent>

              <TabsContent value="weekly">
                <UITable stickyHeader={true}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">Quantity</TableHead>
                      <TableHead className="font-semibold">Revenue Ex VAT</TableHead>
                      <TableHead className="font-semibold">Revenue Inc VAT</TableHead>
                      <TableHead className="font-semibold">Transactions</TableHead>
                      <TableHead className="font-semibold">Workload</TableHead>
                      <TableHead className="font-semibold">MEP Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCategories.length > 0 ? (
                      <AggregatedTable 
                        categories={allCategories} 
                        period="weekly"
                        onUpdateWorkload={handleUpdateWorkload}
                        onUpdateMEP={handleUpdateMEP}
                      />
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data available. Please select a date range to view aggregated totals.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </UITable>
              </TabsContent>

              <TabsContent value="monthly">
                <UITable stickyHeader={true}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Product</TableHead>
                      <TableHead className="font-semibold">Quantity</TableHead>
                      <TableHead className="font-semibold">Revenue Ex VAT</TableHead>
                      <TableHead className="font-semibold">Revenue Inc VAT</TableHead>
                      <TableHead className="font-semibold">Transactions</TableHead>
                      <TableHead className="font-semibold">Workload</TableHead>
                      <TableHead className="font-semibold">MEP Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allCategories.length > 0 ? (
                      <AggregatedTable 
                        categories={allCategories} 
                        period="monthly"
                        onUpdateWorkload={handleUpdateWorkload}
                        onUpdateMEP={handleUpdateMEP}
                      />
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data available. Please select a date range to view aggregated totals.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </UITable>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

