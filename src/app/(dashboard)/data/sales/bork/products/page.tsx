/**
 * Product Performance Page
 */

"use client";

import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { useProductPerformanceViewModel } from "@/viewmodels/sales/useProductPerformanceViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";

export default function ProductPerformancePage() {
  const viewModel = useProductPerformanceViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Calculate totals from product data
  const productTotals = viewModel.productData ? (() => {
    const data = viewModel.productData;
    const totalProducts = data.length;
    const totalQuantity = data.reduce((sum, p) => sum + (p.total_quantity_sold || 0), 0);
    const totalRevenue = data.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
    const totalProfit = data.reduce((sum, p) => sum + (p.total_profit || 0), 0);
    const totalTransactions = data.reduce((sum, p) => sum + (p.transaction_count || 0), 0);
    const avgProductRevenue = totalProducts > 0 ? totalRevenue / totalProducts : 0;
    
    return {
      totalProducts,
      totalQuantity,
      totalRevenue,
      totalProfit,
      totalTransactions,
      avgProductRevenue,
    };
  })() : null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {pageMetadata && (
        <div className="pt-20 space-y-1">
          <h1 className="text-2xl font-semibold">{pageMetadata.label}</h1>
          {pageMetadata.subtitle && (
            <p className="text-sm text-muted-foreground">{pageMetadata.subtitle}</p>
          )}
        </div>
      )}
      
      <div className="space-y-6">
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

        {viewModel.isLoading && <LoadingState />}
        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading product performance data" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.productData && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing {viewModel.productData.length} of {viewModel.total} product{viewModel.total !== 1 ? 's' : ''}
            </div>

            <UITable>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Quantity Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Avg Price</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewModel.productData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No product data found for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  viewModel.productData.map((product: any, index: number) => (
                    <TableRow key={`${product.product_name}_${product.location_id || 'unknown'}_${index}`}>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>{product.location_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatNumber(product.total_quantity_sold, 1)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.total_revenue)}</TableCell>
                      <TableCell className="text-right">
                        {product.total_profit !== null ? formatCurrency(product.total_profit) : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(product.average_unit_price)}</TableCell>
                      <TableCell className="text-right">{product.transaction_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </UITable>

            {/* Product Totals Summary */}
            {productTotals && (
              <AggregatedCostsSummary
                title="Summary"
                metrics={[
                  { label: "Total Products", value: productTotals.totalProducts, format: "number", decimals: 0 },
                  { label: "Total Quantity", value: productTotals.totalQuantity, format: "number", decimals: 0 },
                  { label: "Total Revenue", value: productTotals.totalRevenue, format: "currency" },
                  { label: "Total Profit", value: productTotals.totalProfit, format: "currency" },
                  { label: "Total Transactions", value: productTotals.totalTransactions, format: "number", decimals: 0 },
                  { label: "Avg Product Revenue", value: productTotals.avgProductRevenue, format: "currency" },
                ]}
              />
            )}

            {viewModel.totalPages > 1 && (
              <SimplePagination
                currentPage={viewModel.currentPage}
                totalPages={viewModel.totalPages}
                onPageChange={viewModel.setCurrentPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

