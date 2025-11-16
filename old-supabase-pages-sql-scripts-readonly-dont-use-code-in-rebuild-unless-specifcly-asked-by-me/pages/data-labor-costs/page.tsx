/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/data/labor/costs
 */

"use client";

import { useState, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";

const ITEMS_PER_PAGE = 50;

// Memoized table row for performance
const LaborCostRow = memo(({ record }: { record: any }) => {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || value === 0) return "-";
    return `€${Math.round(Number(value))}`; // No decimals
  };

  // Calculate avg_wage_per_hour if missing but we have the data
  const avgWage = (record.avg_wage_per_hour && Number(record.avg_wage_per_hour) > 0)
    ? record.avg_wage_per_hour
    : (record.total_wage_cost && record.total_hours_worked && Number(record.total_hours_worked) > 0)
      ? Number(record.total_wage_cost) / Number(record.total_hours_worked)
      : 0;

  return (
    <TableRow>
      <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
      <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
      <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
      <TableCell className="font-semibold">
        {formatCurrency(record.total_wage_cost)}
      </TableCell>
      <TableCell>{Number(record.total_hours_worked || 0).toFixed(2)}</TableCell>
      <TableCell>{record.total_breaks_minutes || 0}</TableCell>
      <TableCell>{record.employee_count || 0}</TableCell>
      <TableCell>{record.shift_count || 0}</TableCell>
      <TableCell>{Number(record.avg_hours_per_employee || 0).toFixed(2)}</TableCell>
      <TableCell className="font-semibold">
        {avgWage && Number(avgWage) > 0 
          ? formatCurrency(avgWage)
          : "-"}
      </TableCell>
      <TableCell>
        {record.updated_at ? formatDateDDMMYYTime(record.updated_at) : "-"}
      </TableCell>
    </TableRow>
  );
});

LaborCostRow.displayName = "LaborCostRow";

export default function LaborCostsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations - filter out "All HNHG Locations"
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .neq("name", "All HNHG Locations")
        .neq("name", "All HNG Locations")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch environment IDs when a location is selected
  // Match by name since there's no location_id column in eitje_environments
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      
      const supabase = createClient();
      // Match by name since there's no location_id column in eitje_environments
      try {
        // Get the selected location name (locations are already fetched in the component)
        const { data: locsData } = await supabase
          .from("locations")
          .select("id, name");
        
        const selectedLoc = locsData?.find((loc) => loc.id === selectedLocation);
        if (!selectedLoc) return [];
        
        // Fetch all environments and match by name
        const { data: allEnvs, error } = await supabase
          .from("eitje_environments")
          .select("id, raw_data");
        
        if (error) {
          console.error("Error fetching environments:", error);
          return [];
        }
        
        // Match environment names to location name (case-insensitive)
        const matchedIds = (allEnvs || [])
          .filter((env: any) => {
            const envName = env.raw_data?.name || "";
            return envName.toLowerCase() === selectedLoc.name.toLowerCase();
          })
          .map((env: any) => env.id);
        
        return matchedIds;
      } catch (error) {
        console.error("Error in environment ID query:", error);
        return [];
      }
    },
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: any = {};
    
    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null) {
      // If both day and month are selected, filter by specific day
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      // If only month is selected, filter by entire month
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, dateRange]);

  // Fetch aggregated labor costs data - SELECT ONLY NEEDED COLUMNS
  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-labor-costs", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      const supabase = createClient();
      
      // Fetch aggregated data
      let query = supabase
        .from("eitje_labor_hours_aggregated")
        .select(`
          id, 
          date, 
          environment_id,
          team_id,
          total_wage_cost, 
          total_hours_worked, 
          total_breaks_minutes, 
          employee_count, 
          shift_count, 
          avg_hours_per_employee, 
          avg_wage_per_hour, 
          updated_at
        `, { count: "exact" });

      // Apply date filters
      if (queryFilters.startDate && queryFilters.endDate) {
        query = query
          .gte("date", queryFilters.startDate)
          .lte("date", queryFilters.endDate);
      }

      // Apply location filter - use environmentIds from hook (mapped from location UUID)
      if (selectedLocation !== "all" && environmentIds) {
        if (environmentIds.length > 0) {
          query = query.in("environment_id", environmentIds);
        } else {
          // If location is selected but no environments found, return empty result
          query = query.eq("environment_id", -999);
        }
      }

      // Apply ordering (latest date first)
      query = query.order("date", { ascending: false });

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: records, error: queryError, count } = await query;

      if (queryError) {
        throw queryError;
      }

      // Fetch environment and team names separately
      // Filter out null/undefined and ensure we have valid integers
      // Note: Renamed to avoid shadowing the hook's environmentIds variable
      const recordEnvironmentIds = [...new Set((records || [])
        .map((r: any) => r.environment_id)
        .filter((id: any) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: any) => Number(id))
      )];
      const recordTeamIds = [...new Set((records || [])
        .map((r: any) => r.team_id)
        .filter((id: any) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: any) => Number(id))
      )];
      
      let environmentMap: Record<number, string> = {};
      let teamMap: Record<number, string> = {};
      
      if (recordEnvironmentIds.length > 0) {
        try {
          // Tables use id (not eitje_environment_id) and name is in raw_data
          const { data: environments, error: envError } = await supabase
            .from("eitje_environments")
            .select("id, raw_data")
            .in("id", recordEnvironmentIds);
          
          if (envError) {
            console.error("Error fetching environments:", {
              message: envError.message,
              details: envError.details,
              hint: envError.hint,
              code: envError.code
            });
          } else if (environments) {
            // Extract name from raw_data
            environmentMap = Object.fromEntries(
              environments.map((env: any) => [
                env.id,
                env.raw_data?.name || `Environment ${env.id}`
              ])
            );
          }
        } catch (error) {
          console.error("Error in environment query:", error);
        }
      }

      if (recordTeamIds.length > 0) {
        try {
          // Tables use id (not eitje_team_id) and name is in raw_data
          const { data: teams, error: teamError } = await supabase
            .from("eitje_teams")
            .select("id, raw_data")
            .in("id", recordTeamIds);
          
          if (teamError) {
            console.error("Error fetching teams:", {
              message: teamError.message,
              details: teamError.details,
              hint: teamError.hint,
              code: teamError.code
            });
          } else if (teams) {
            // Extract name from raw_data
            teamMap = Object.fromEntries(
              teams.map((team: any) => [
                team.id,
                team.raw_data?.name || `Team ${team.id}`
              ])
            );
          }
        } catch (error) {
          console.error("Error in team query:", error);
        }
      }

      // Merge names into records and filter to only show "Keuken" and "Bediening" teams
      let recordsWithNames = (records || [])
        .map((record: any) => ({
          ...record,
          environment_name: environmentMap[record.environment_id] || null,
          team_name: record.team_id ? (teamMap[record.team_id] || null) : null,
          // Recalculate avg_wage_per_hour if it's 0 but we have wage_cost and hours
          avg_wage_per_hour: (record.avg_wage_per_hour && Number(record.avg_wage_per_hour) > 0) 
            ? record.avg_wage_per_hour
            : (record.total_wage_cost && record.total_hours_worked && Number(record.total_hours_worked) > 0)
              ? Number(record.total_wage_cost) / Number(record.total_hours_worked)
              : 0
        }))
        .filter((record: any) => {
          // Only show records where team_name is "Keuken" or "Bediening"
          const teamName = record.team_name?.toLowerCase() || "";
          return teamName === "keuken" || teamName === "bediening";
        });

      // If "All Locations" is selected, aggregate by date and team (sum across all locations)
      if (selectedLocation === "all") {
        const aggregatedByDateTeam = new Map<string, any>();

        recordsWithNames.forEach((record: any) => {
          const key = `${record.date}-${record.team_id || 'null'}`;
          
          if (!aggregatedByDateTeam.has(key)) {
            aggregatedByDateTeam.set(key, {
              date: record.date,
              team_id: record.team_id,
              team_name: record.team_name,
              environment_name: "All Locations",
              total_hours_worked: 0,
              total_breaks_minutes: 0,
              total_wage_cost: 0,
              employee_count: 0,
              shift_count: 0,
              id: `agg-${key}`
            });
          }
          
          const agg = aggregatedByDateTeam.get(key)!;
          agg.total_hours_worked += Number(record.total_hours_worked || 0);
          agg.total_breaks_minutes += Number(record.total_breaks_minutes || 0);
          agg.total_wage_cost += Number(record.total_wage_cost || 0);
          agg.employee_count += Number(record.employee_count || 0);
          agg.shift_count += Number(record.shift_count || 0);
        });

        // Calculate averages and convert to array, sorted by date descending
        recordsWithNames = Array.from(aggregatedByDateTeam.values())
          .map(agg => ({
            ...agg,
            avg_hours_per_employee: agg.employee_count > 0 
              ? agg.total_hours_worked / agg.employee_count 
              : 0,
            avg_wage_per_hour: agg.total_hours_worked > 0
              ? agg.total_wage_cost / agg.total_hours_worked
              : 0,
            updated_at: null // No specific updated_at for aggregated records
          }))
          .sort((a, b) => {
            // Sort by date descending, then by team name
            const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return (a.team_name || '').localeCompare(b.team_name || '');
          });
      }

      return {
        records: recordsWithNames,
        total: recordsWithNames.length,
      };
    },
    enabled: !!queryFilters.startDate && (selectedLocation === "all" || !isLoadingEnvIds),
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 min-w-0">
      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year);
          setCurrentPage(1);
        }}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          if (month === null) {
            setSelectedDay(null); // Clear day when month is cleared
          }
          setCurrentPage(1);
        }}
        selectedDay={selectedDay}
        onDayChange={(day) => {
          setSelectedDay(day);
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
        onResetToDefault={() => {
          setSelectedYear(2025);
          setSelectedMonth(null);
          setSelectedDay(null);
          setSelectedLocation("all");
          setSelectedDatePreset("this-month");
          setCurrentPage(1);
        }}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Cost Data</CardTitle>
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
              <div className="mt-16 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Labor Cost</TableHead>
                      <TableHead className="font-semibold">Total Hours Worked</TableHead>
                      <TableHead className="font-semibold">Total Breaks (min)</TableHead>
                      <TableHead className="font-semibold">Employee Count</TableHead>
                      <TableHead className="font-semibold">Shift Count</TableHead>
                      <TableHead className="font-semibold">Avg Hours/Employee</TableHead>
                      <TableHead className="font-semibold">Avg Wage/Hour</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => (
                        <LaborCostRow key={record.id} record={record} />
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

