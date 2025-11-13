/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/view-data
 */

"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 50;

export default function HoursPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-month");
  const [currentPage, setCurrentPage] = useState(1);

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("locations").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: any = {};
    
    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedMonth) {
      // If month is selected, filter by year and month
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      // Filter by year
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedLocation, dateRange]);

  // Fetch data
  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-hours", queryFilters, currentPage],
    queryFn: async () => {
      const supabase = createClient();
      
      let query = supabase
        .from("eitje_labor_hours_aggregated")
        .select("*", { count: "exact" })
        .order("date", { ascending: false });

      // Apply date filters
      if (queryFilters.startDate && queryFilters.endDate) {
        query = query.gte("date", queryFilters.startDate).lte("date", queryFilters.endDate);
      }

      // Apply location filter if needed
      if (queryFilters.environmentId) {
        query = query.eq("environment_id", queryFilters.environmentId);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: records, error: queryError, count } = await query;

      if (queryError) throw queryError;

      return {
        records: records || [],
        total: count || 0,
      };
    },
    enabled: !!queryFilters.startDate,
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedDatePreset(preset);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hours Data</CardTitle>
          <CardDescription>
            View time registration shifts and labor hours data from Eitje
          </CardDescription>
        </CardHeader>
      </Card>

      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year);
          setCurrentPage(1);
        }}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          setCurrentPage(1);
        }}
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          setCurrentPage(1);
        }}
        selectedDatePreset={selectedDatePreset}
        onDatePresetChange={handleDatePresetChange}
        locations={locationOptions}
      />

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
                      <TableHead>Date</TableHead>
                      <TableHead>Environment ID</TableHead>
                      <TableHead>Team ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Wage Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.date ? format(new Date(record.date), "yyyy-MM-dd") : "-"}</TableCell>
                          <TableCell>{record.environment_id || "-"}</TableCell>
                          <TableCell>{record.team_id || "-"}</TableCell>
                          <TableCell>{record.user_id || "-"}</TableCell>
                          <TableCell>{record.hours_worked || record.hours || record.total_hours || "-"}</TableCell>
                          <TableCell>{record.wage_cost ? `€${Number(record.wage_cost).toFixed(2)}` : "-"}</TableCell>
                          <TableCell>{record.status || "-"}</TableCell>
                          <TableCell>
                            {record.created_at ? format(new Date(record.created_at), "yyyy-MM-dd HH:mm") : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
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

