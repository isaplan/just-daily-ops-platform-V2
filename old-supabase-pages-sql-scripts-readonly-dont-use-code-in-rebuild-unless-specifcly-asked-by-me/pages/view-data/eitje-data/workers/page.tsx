/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/view-data
 */

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 50;

export default function WorkersPage() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-workers", currentPage],
    queryFn: async () => {
      const supabase = createClient();
      
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: records, error: queryError, count } = await supabase
        .from("eitje_users")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (queryError) throw queryError;

      return {
        records: records || [],
        total: count || 0,
      };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workers Data</CardTitle>
          <CardDescription>
            View employee and worker information from Eitje
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Eitje ID</TableHead>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Employee Number</TableHead>
                      <TableHead>Hire Date</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Created At</TableHead>
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
                      data.records.map((record: any) => {
                        // Extract from raw_data if direct fields don't exist
                        const firstName = record.first_name || record.raw_data?.first_name || record.raw_data?.firstName || "-";
                        const lastName = record.last_name || record.raw_data?.last_name || record.raw_data?.lastName || "-";
                        const email = record.email || record.raw_data?.email || "-";
                        const phone = record.phone || record.raw_data?.phone || "-";
                        const employeeNumber = record.employee_number || record.raw_data?.employee_number || record.raw_data?.employeeNumber || "-";
                        const hireDate = record.hire_date || record.raw_data?.hire_date || record.raw_data?.hireDate || null;
                        const isActive = record.is_active !== undefined ? record.is_active : (record.raw_data?.is_active ?? true);

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{record.eitje_id || record.id || "-"}</TableCell>
                            <TableCell>{firstName}</TableCell>
                            <TableCell>{lastName}</TableCell>
                            <TableCell>{email}</TableCell>
                            <TableCell>{phone}</TableCell>
                            <TableCell>{employeeNumber}</TableCell>
                            <TableCell>
                              {hireDate ? format(new Date(hireDate), "yyyy-MM-dd") : "-"}
                            </TableCell>
                            <TableCell>{isActive ? "Yes" : "No"}</TableCell>
                            <TableCell>
                              {record.created_at ? format(new Date(record.created_at), "yyyy-MM-dd HH:mm") : "-"}
                            </TableCell>
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


