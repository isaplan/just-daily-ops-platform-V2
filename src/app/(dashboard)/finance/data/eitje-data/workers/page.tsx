/**
 * Finance Eitje Data Workers View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";
import { useEitjeDataWorkersViewModel } from "@/viewmodels/finance/useEitjeDataWorkersViewModel";

export default function WorkersPage() {
  const {
    // State
    currentPage,
    setCurrentPage,
    showAllColumns,
    setShowAllColumns,

    // Data
    data,
    isLoading,
    error,

    // Computed
    totalPages,
  } = useEitjeDataWorkersViewModel();

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading data: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              <div className="mt-16">
                <ShowMoreColumnsToggle
                  isExpanded={showAllColumns}
                  onToggle={setShowAllColumns}
                  coreColumnCount={9}
                  totalColumnCount={9}
                />
              </div>
              <div className="mt-4 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Eitje ID</TableHead>
                      <TableHead className="font-semibold">First Name</TableHead>
                      <TableHead className="font-semibold">Last Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Employee Number</TableHead>
                      <TableHead className="font-semibold">Hire Date</TableHead>
                      <TableHead className="font-semibold">Active</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                      {/* Additional columns (name, code, contract_type, hourly_wage, contract_hours) will be available after migrations run */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record) => {
                        // Extract from raw_data if direct fields don't exist
                        const firstName =
                          record.first_name ||
                          (record.raw_data as { first_name?: string; firstName?: string })?.first_name ||
                          (record.raw_data as { firstName?: string })?.firstName ||
                          "-";
                        const lastName =
                          record.last_name ||
                          (record.raw_data as { last_name?: string; lastName?: string })?.last_name ||
                          (record.raw_data as { lastName?: string })?.lastName ||
                          "-";
                        const email =
                          record.email ||
                          (record.raw_data as { email?: string })?.email ||
                          "-";
                        const phone =
                          record.phone ||
                          (record.raw_data as { phone?: string })?.phone ||
                          "-";
                        const employeeNumber =
                          record.employee_number ||
                          (record.raw_data as { employee_number?: string; employeeNumber?: string })?.employee_number ||
                          (record.raw_data as { employeeNumber?: string })?.employeeNumber ||
                          "-";
                        const hireDate =
                          record.hire_date ||
                          (record.raw_data as { hire_date?: string; hireDate?: string })?.hire_date ||
                          (record.raw_data as { hireDate?: string })?.hireDate ||
                          null;
                        const isActive =
                          record.is_active !== undefined
                            ? record.is_active
                            : ((record.raw_data as { is_active?: boolean })?.is_active ?? true);

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{record.eitje_id || record.id || "-"}</TableCell>
                            <TableCell>{firstName}</TableCell>
                            <TableCell>{lastName}</TableCell>
                            <TableCell>{email}</TableCell>
                            <TableCell>{phone}</TableCell>
                            <TableCell>{employeeNumber}</TableCell>
                            <TableCell>{formatDateDDMMYY(hireDate)}</TableCell>
                            <TableCell>{isActive ? "Yes" : "No"}</TableCell>
                            <TableCell>{formatDateDDMMYYTime(record.created_at)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
