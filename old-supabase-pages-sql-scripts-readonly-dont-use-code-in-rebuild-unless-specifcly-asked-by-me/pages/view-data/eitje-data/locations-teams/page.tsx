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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 50;

export default function LocationsTeamsPage() {
  const [currentPageLocations, setCurrentPageLocations] = useState(1);
  const [currentPageTeams, setCurrentPageTeams] = useState(1);
  const [activeTab, setActiveTab] = useState("locations");

  // Fetch locations
  const { data: locationsData, isLoading: locationsLoading, error: locationsError } = useQuery({
    queryKey: ["eitje-locations", currentPageLocations],
    queryFn: async () => {
      const supabase = createClient();
      
      const from = (currentPageLocations - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: records, error: queryError, count } = await supabase
        .from("eitje_environments")
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

  // Fetch teams
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useQuery({
    queryKey: ["eitje-teams", currentPageTeams],
    queryFn: async () => {
      const supabase = createClient();
      
      const from = (currentPageTeams - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data: records, error: queryError, count } = await supabase
        .from("eitje_teams")
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

  const locationsTotalPages = Math.ceil((locationsData?.total || 0) / ITEMS_PER_PAGE);
  const teamsTotalPages = Math.ceil((teamsData?.total || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Locations & Teams Data</CardTitle>
          <CardDescription>
            View environments (locations) and teams data from Eitje
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>

            {/* Locations Tab */}
            <TabsContent value="locations" className="space-y-4">
              <div>
                <CardTitle className="mb-2">Locations Data</CardTitle>
                <CardDescription>
                  Showing {locationsData?.records.length || 0} of {locationsData?.total || 0} records
                </CardDescription>
              </div>

              {locationsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {locationsError && (
                <div className="text-center py-8 text-destructive">
                  Error loading data: {locationsError instanceof Error ? locationsError.message : "Unknown error"}
                </div>
              )}

              {!locationsLoading && !locationsError && locationsData && (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Eitje ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>City</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locationsData.records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No data found
                            </TableCell>
                          </TableRow>
                        ) : (
                          locationsData.records.map((record: any) => {
                            const name = record.name || record.raw_data?.name || "-";
                            const description = record.description || record.raw_data?.description || "-";
                            const city = record.city || record.raw_data?.city || "-";
                            const country = record.country || record.raw_data?.country || "-";
                            const isActive = record.is_active !== undefined ? record.is_active : (record.raw_data?.is_active ?? true);

                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.eitje_id || record.id || "-"}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell className="max-w-xs truncate">{description}</TableCell>
                                <TableCell>{city}</TableCell>
                                <TableCell>{country}</TableCell>
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
                      Page {currentPageLocations} of {locationsTotalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageLocations((p) => Math.max(1, p - 1))}
                        disabled={currentPageLocations === 1 || locationsLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageLocations((p) => Math.min(locationsTotalPages, p + 1))}
                        disabled={currentPageLocations === locationsTotalPages || locationsLoading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-4">
              <div>
                <CardTitle className="mb-2">Teams Data</CardTitle>
                <CardDescription>
                  Showing {teamsData?.records.length || 0} of {teamsData?.total || 0} records
                </CardDescription>
              </div>

              {teamsLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {teamsError && (
                <div className="text-center py-8 text-destructive">
                  Error loading data: {teamsError instanceof Error ? teamsError.message : "Unknown error"}
                </div>
              )}

              {!teamsLoading && !teamsError && teamsData && (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Eitje ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Environment ID</TableHead>
                          <TableHead>Team Type</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamsData.records.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No data found
                            </TableCell>
                          </TableRow>
                        ) : (
                          teamsData.records.map((record: any) => {
                            const name = record.name || record.raw_data?.name || "-";
                            const description = record.description || record.raw_data?.description || "-";
                            const teamType = record.team_type || record.raw_data?.team_type || record.raw_data?.teamType || "-";
                            const isActive = record.is_active !== undefined ? record.is_active : (record.raw_data?.is_active ?? true);

                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.eitje_id || record.id || "-"}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell className="max-w-xs truncate">{description}</TableCell>
                                <TableCell>{record.environment_id || "-"}</TableCell>
                                <TableCell>{teamType}</TableCell>
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
                      Page {currentPageTeams} of {teamsTotalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageTeams((p) => Math.max(1, p - 1))}
                        disabled={currentPageTeams === 1 || teamsLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPageTeams((p) => Math.min(teamsTotalPages, p + 1))}
                        disabled={currentPageTeams === teamsTotalPages || teamsLoading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


