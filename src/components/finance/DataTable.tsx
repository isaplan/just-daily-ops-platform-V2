import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceType } from "@/pages/departments/FinanceDataViewer";
import { format } from "date-fns";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

interface DataTableProps {
  data: any[];
  isLoading: boolean;
  sourceType: SourceType;
  currentPage: number;
  totalPages: number;
  rowsPerPage: 10 | 20 | 50 | 100;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: 10 | 20 | 50 | 100) => void;
}

export function DataTable({
  data,
  isLoading,
  sourceType,
  currentPage,
  totalPages,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
}: DataTableProps) {
  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `finance-data-${sourceType}-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const renderTableHeaders = () => {
    if (sourceType === "sales" || sourceType === "all") {
      return (
        <>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead className="text-right">Price (Ex BTW)</TableHead>
          <TableHead className="text-right">Price (Inc BTW)</TableHead>
          <TableHead>Division</TableHead>
        </>
      );
    }

    if (sourceType === "labor") {
      return (
        <>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Employee</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>Shift Type</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Hourly Rate</TableHead>
          <TableHead className="text-right">Labor Cost</TableHead>
        </>
      );
    }

    if (sourceType === "productivity") {
      return (
        <>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Hours Worked</TableHead>
          <TableHead className="text-right">Labor Cost</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Labor %</TableHead>
          <TableHead className="text-right">Productivity/Hr</TableHead>
        </>
      );
    }

    if (sourceType === "pnl") {
      return (
        <>
          <TableHead>Date</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>GL Account</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Subcategory</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </>
      );
    }

    if (sourceType === "warehouse_summary") {
      return (
        <>
          <TableHead>Period</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">COGS</TableHead>
          <TableHead className="text-right">GP%</TableHead>
          <TableHead className="text-right">Labor Cost</TableHead>
          <TableHead className="text-right">Labor%</TableHead>
          <TableHead className="text-right">EBITDA%</TableHead>
        </>
      );
    }

    if (sourceType === "warehouse_facts") {
      return (
        <>
          <TableHead>Period</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Account Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Subcategory</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </>
      );
    }

    if (sourceType === "warehouse_kpis") {
      return (
        <>
          <TableHead>Period</TableHead>
          <TableHead>Location</TableHead>
          <TableHead className="text-right">Total Revenue</TableHead>
          <TableHead className="text-right">Total COGS</TableHead>
          <TableHead className="text-right">Gross Profit</TableHead>
          <TableHead className="text-right">Labor Cost</TableHead>
          <TableHead className="text-right">EBITDA</TableHead>
        </>
      );
    }

    return <TableHead>No columns available</TableHead>;
  };

  const renderTableRow = (row: any, index: number) => {
    if (sourceType === "sales" || (sourceType === "all" && row.product_name)) {
      return (
        <TableRow key={index}>
          <TableCell>{row.sale_timestamp ? format(new Date(row.sale_timestamp), "PPp") : "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell>{row.product_name || "-"}</TableCell>
          <TableCell>{row.category || "-"}</TableCell>
          <TableCell>{row.quantity?.toFixed(2) || "-"}</TableCell>
          <TableCell className="text-right">€{row.price_ex_btw?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.price_inc_btw?.toFixed(2) || "0.00"}</TableCell>
          <TableCell>{row.division || "-"}</TableCell>
        </TableRow>
      );
    }

    if (sourceType === "labor" || (sourceType === "all" && row.employee_name)) {
      return (
        <TableRow key={index}>
          <TableCell>{row.date ? format(new Date(row.date), "PP") : "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell>{row.employee_name || "-"}</TableCell>
          <TableCell>{row.team_name || "-"}</TableCell>
          <TableCell>{row.shift_type || "-"}</TableCell>
          <TableCell className="text-right">{row.hours?.toFixed(2) || "0"}</TableCell>
          <TableCell className="text-right">€{row.hourly_rate?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.labor_cost?.toFixed(2) || "0.00"}</TableCell>
        </TableRow>
      );
    }

    if (sourceType === "productivity" || (sourceType === "all" && row.productivity_per_hour)) {
      return (
        <TableRow key={index}>
          <TableCell>{row.date ? format(new Date(row.date), "PP") : "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell>{row.team_name || "-"}</TableCell>
          <TableCell className="text-right">{row.hours_worked?.toFixed(2) || "0"}</TableCell>
          <TableCell className="text-right">€{row.labor_cost?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.revenue?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">{row.labor_cost_percentage?.toFixed(1) || "0"}%</TableCell>
          <TableCell className="text-right">€{row.productivity_per_hour?.toFixed(2) || "0.00"}</TableCell>
        </TableRow>
      );
    }

    if (sourceType === "pnl" || (sourceType === "all" && row.gl_account)) {
      return (
        <TableRow key={index}>
          <TableCell>{row.month && row.year ? `${row.month}/${row.year}` : "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell>{row.gl_account || "-"}</TableCell>
          <TableCell>{row.category || "-"}</TableCell>
          <TableCell>{row.subcategory || "-"}</TableCell>
          <TableCell className="text-right">€{row.amount?.toFixed(2) || "0.00"}</TableCell>
        </TableRow>
      );
    }

    if (sourceType === "warehouse_summary") {
      return (
        <TableRow key={index}>
          <TableCell>{row.period_name || "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell className="text-right">€{row.total_revenue?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.total_cogs?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">{row.gross_profit_pct?.toFixed(1) || "0"}%</TableCell>
          <TableCell className="text-right">€{row.labor_cost?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">{row.labor_cost_pct?.toFixed(1) || "0"}%</TableCell>
          <TableCell className="text-right">{row.ebitda_pct?.toFixed(1) || "0"}%</TableCell>
        </TableRow>
      );
    }

    if (sourceType === "warehouse_facts") {
      return (
        <TableRow key={index}>
          <TableCell>{row.period_name || "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell>{row.account_type || "-"}</TableCell>
          <TableCell>{row.category || "-"}</TableCell>
          <TableCell>{row.subcategory || "-"}</TableCell>
          <TableCell className="text-right">€{row.amount?.toFixed(2) || "0.00"}</TableCell>
        </TableRow>
      );
    }

    if (sourceType === "warehouse_kpis") {
      return (
        <TableRow key={index}>
          <TableCell>{row.period_name || "-"}</TableCell>
          <TableCell>{row.location_name || "-"}</TableCell>
          <TableCell className="text-right">€{row.total_revenue?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.total_cogs?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.gross_profit?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.labor_cost?.toFixed(2) || "0.00"}</TableCell>
          <TableCell className="text-right">€{row.ebitda?.toFixed(2) || "0.00"}</TableCell>
        </TableRow>
      );
    }

    return <TableRow key={index}><TableCell>Unknown data type</TableCell></TableRow>;
  };

  const renderPaginationItems = () => {
    const items = [];
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink onClick={() => onPageChange(1)} isActive={currentPage === 1}>
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (showEllipsisStart) {
      items.push(<PaginationEllipsis key="ellipsis-start" />);
    }

    // Show pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => onPageChange(i)} isActive={currentPage === i}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (showEllipsisEnd) {
      items.push(<PaginationEllipsis key="ellipsis-end" />);
    }

    // Always show last page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => onPageChange(totalPages)} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  const startRecord = (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalCount);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Data Records</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data.length}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>{renderTableHeaders()}</TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: rowsPerPage }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No data found. Try adjusting your filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => renderTableRow(row, index))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select
              value={rowsPerPage.toString()}
              onValueChange={(value) => onRowsPerPageChange(Number(value) as 10 | 20 | 50 | 100)}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {startRecord}-{endRecord} of {totalCount}
            </span>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
                {renderPaginationItems()}
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
