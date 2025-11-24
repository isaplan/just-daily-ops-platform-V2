/**
 * Bork Sales Data V2 Client Component
 * Handles all interactivity - receives initial data from Server Component
 */

"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { useBorkSalesV2ViewModel } from "@/viewmodels/sales/useBorkSalesV2ViewModel";
import { BorkSalesRecord } from "@/models/sales/bork-sales-v2.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Ban, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { AggregatedCostsSummary } from "@/components/view-data/AggregatedCostsSummary";

// Helper to format time string (HH:MM or HH:MM:SS format)
// Converts UTC time to Amsterdam timezone (UTC+1, currently CET)
function formatTimeString(time: string | null | undefined): string {
  if (!time) return "-";
  // Extract HH:MM from time string (handles HH:MM:SS format)
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    // Parse as UTC and convert to Amsterdam timezone
    const utcHours = parseInt(match[1], 10);
    const minutes = match[2];
    // Add 1 hour for Amsterdam timezone (UTC+1, currently CET)
    const amsterdamHours = (utcHours + 1) % 24;
    const hours = String(amsterdamHours).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  return time;
}

// Helper to check if record is cancelled (negative quantity)
function isCancelled(record: BorkSalesRecord): boolean {
  return record.quantity !== null && record.quantity !== undefined && record.quantity < 0;
}

// Category Filter Component with Top 10 + Collapsible Rest
function CategoryFilterButtons({
  top10,
  rest,
  selectedValue,
  onValueChange,
}: {
  top10: Array<{ value: string; label: string }>;
  rest: Array<{ value: string; label: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <span className="text-sm font-bold text-foreground">Category</span>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Top 10 categories */}
          {top10.map((option) => {
            const isActive = selectedValue === option.value;
            return (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className={`border rounded-sm ${
                  isActive
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                }`}
                onClick={() => onValueChange(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
          
          {/* Collapsible trigger button */}
          {rest.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border rounded-sm bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white inline-flex items-center gap-1"
              >
                <span>More ({rest.length})</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        
        {/* Collapsible content - expands below */}
        {rest.length > 0 && (
          <CollapsibleContent className="mt-2">
            <div className="flex gap-2 flex-wrap">
              {rest.map((option) => {
                const isActive = selectedValue === option.value;
                return (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    className={`border rounded-sm ${
                      isActive
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                    }`}
                    onClick={() => onValueChange(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

interface BorkSalesClientProps {
  initialData?: {
    salesData?: any;
    locations?: any[];
  };
}

export function BorkSalesClient({ initialData }: BorkSalesClientProps) {
  const viewModel = useBorkSalesV2ViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);

  // Calculate totals from sales data
  const salesTotals = viewModel.salesData?.records ? (() => {
    const records = viewModel.salesData.records;
    const totalRevenue = records.reduce((sum, r) => {
      const revenue = r.price_inc_vat ? Number(r.price_inc_vat) * (r.quantity || 0) : 0;
      return sum + (isCancelled(r) ? 0 : revenue); // Exclude cancelled items
    }, 0);
    const totalQuantity = records.reduce((sum, r) => sum + (isCancelled(r) ? 0 : Math.abs(r.quantity || 0)), 0);
    const totalTransactions = new Set(records.filter(r => !isCancelled(r)).map(r => r.ticket_key)).size;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    return {
      totalRevenue,
      totalQuantity,
      totalTransactions,
      avgTransactionValue,
    };
  })() : null;

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

      {/* Category Filter */}
      {viewModel.isCurrentYear && (
        <CategoryFilterButtons
          top10={viewModel.categoryOptions.top10}
          rest={viewModel.categoryOptions.rest}
          selectedValue={viewModel.selectedCategory}
          onValueChange={viewModel.setSelectedCategory}
        />
      )}

      {/* Sales Table */}
      {viewModel.isLoading && <LoadingState />}

      {viewModel.error && (
        <ErrorState error={viewModel.error} message="Error loading sales data" />
      )}

      {!viewModel.isLoading && !viewModel.error && viewModel.salesData && viewModel.salesData.records && (
        <>
          <div className="mt-4">
            <ShowMoreColumnsToggle
              isExpanded={viewModel.showAllColumns}
              onToggle={viewModel.setShowAllColumns}
              coreColumnCount={12}
              totalColumnCount={18}
            />
          </div>
          <UITable stickyHeader={true} stickyFirstColumn={true}>
            <TableHeader className="!sticky !top-0">
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Time</TableHead>
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Price inc VAT</TableHead>
                <TableHead className="font-semibold">Price ex VAT</TableHead>
                <TableHead className="font-semibold">VAT Rate</TableHead>
                <TableHead className="font-semibold">VAT Amount</TableHead>
                <TableHead className="font-semibold">Table</TableHead>
                <TableHead className="font-semibold">Waiter</TableHead>
                {viewModel.showAllColumns && (
                  <>
                    <TableHead className="font-semibold">Ticket Key</TableHead>
                    <TableHead className="font-semibold">Order Key</TableHead>
                    <TableHead className="font-semibold">Product SKU</TableHead>
                    <TableHead className="font-semibold">Cost Price</TableHead>
                    <TableHead className="font-semibold">Created At</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewModel.salesData.records && viewModel.salesData.records.length > 0 ? (
                viewModel.salesData.records.map((record: BorkSalesRecord) => {
                  const cancelled = isCancelled(record);
                  const rowClassName = cancelled ? "bg-red-50" : "";
                  
                  return (
                    <TableRow key={record.id} className={rowClassName}>
                      <TableCell className={cancelled ? "text-red-600 font-medium" : ""}>
                        {formatDateDDMMYY(record.date)}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {formatTimeString(record.time)}
                      </TableCell>
                      <TableCell className={`whitespace-nowrap ${cancelled ? "text-red-600" : ""}`}>
                        {record.location_name || record.location_id || "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        <div className="flex items-center gap-2">
                          <span>{record.product_name || "-"}</span>
                          {cancelled && (
                            <div className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center flex-shrink-0">
                              <Ban className="h-2.5 w-2.5" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.category || record.group_name || "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600 font-medium" : ""}>
                        {record.quantity !== null && record.quantity !== undefined ? formatNumber(Number(record.quantity), 2) : "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.total_inc_vat !== null && record.total_inc_vat !== undefined ? formatCurrency(Number(record.total_inc_vat)) : "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.total_ex_vat !== null && record.total_ex_vat !== undefined ? formatCurrency(Number(record.total_ex_vat)) : "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.vat_rate !== null && record.vat_rate !== undefined ? `${formatNumber(Number(record.vat_rate), 1)}%` : "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.vat_amount !== null && record.vat_amount !== undefined ? formatCurrency(Number(record.vat_amount)) : "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.table_number || "-"}
                      </TableCell>
                      <TableCell className={cancelled ? "text-red-600" : ""}>
                        {record.waiter_name || "-"}
                      </TableCell>
                      {viewModel.showAllColumns && (
                        <>
                          <TableCell className={`font-mono text-xs ${cancelled ? "text-red-600" : ""}`}>
                            {record.ticket_key || "-"}
                          </TableCell>
                          <TableCell className={`font-mono text-xs ${cancelled ? "text-red-600" : ""}`}>
                            {record.order_key || "-"}
                          </TableCell>
                          <TableCell className={cancelled ? "text-red-600" : ""}>
                            {record.product_sku || "-"}
                          </TableCell>
                          <TableCell className={cancelled ? "text-red-600" : ""}>
                            {record.cost_price !== null && record.cost_price !== undefined ? formatCurrency(Number(record.cost_price)) : "-"}
                          </TableCell>
                          <TableCell className={cancelled ? "text-red-600" : ""}>
                            {record.created_at ? formatDateDDMMYY(record.created_at) : "-"}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={viewModel.showAllColumns ? 18 : 12} className="text-center py-8 text-muted-foreground">
                    No sales data found
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
        </UITable>

        {/* Sales Totals Summary */}
        {salesTotals && (
          <AggregatedCostsSummary
            title="Summary"
            metrics={[
              { label: "Total Revenue", value: salesTotals.totalRevenue, format: "currency" },
              { label: "Total Quantity", value: salesTotals.totalQuantity, format: "number", decimals: 0 },
              { label: "Total Transactions", value: salesTotals.totalTransactions, format: "number", decimals: 0 },
              { label: "Avg Transaction Value", value: salesTotals.avgTransactionValue, format: "currency" },
            ]}
          />
        )}

        {/* Pagination */}
        <SimplePagination
          currentPage={viewModel.currentPage}
          totalPages={viewModel.totalPages}
          totalRecords={viewModel.salesData?.total || 0}
          onPageChange={viewModel.setCurrentPage}
          isLoading={viewModel.isLoading}
        />
      </>
    )}
    </div>
  </div>
  );
}

