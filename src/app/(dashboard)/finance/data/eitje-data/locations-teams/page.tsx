/**
 * Finance Eitje Data Locations & Teams View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatDateDDMMYYTime } from "@/lib/dateFormatters";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";
import { useEitjeDataLocationsTeamsViewModel } from "@/viewmodels/finance/useEitjeDataLocationsTeamsViewModel";

export default function LocationsTeamsPage() {
  const {
    // State
    currentPageLocations,
    setCurrentPageLocations,
    currentPageTeams,
    setCurrentPageTeams,
    activeTab,
    setActiveTab,
    showAllColumnsLocations,
    setShowAllColumnsLocations,
    showAllColumnsTeams,
    setShowAllColumnsTeams,

    // Data
    locationsData,
    locationsLoading,
    locationsError,
    teamsData,
    teamsLoading,
    teamsError,

    // Computed
    locationsTotalPages,
    teamsTotalPages,
  } = useEitjeDataLocationsTeamsViewModel();

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "locations" | "teams")}>
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
                  <div className="mt-16">
                    <ShowMoreColumnsToggle
                      isExpanded={showAllColumnsLocations}
                      onToggle={setShowAllColumnsLocations}
                      coreColumnCount={7}
                      totalColumnCount={7}
                    />
                  </div>
                  <div className="mt-4 bg-white rounded-sm border border-black px-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Eitje ID</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">City</TableHead>
                          <TableHead className="font-semibold">Country</TableHead>
                          <TableHead className="font-semibold">Active</TableHead>
                          <TableHead className="font-semibold">Created At</TableHead>
                          {/* Additional columns (address, postal_code, timezone, code, type) will be available after migrations run */}
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
                          locationsData.records.map((record) => {
                            const name =
                              record.name ||
                              (record.raw_data as { name?: string })?.name ||
                              "-";
                            const description =
                              record.description ||
                              (record.raw_data as { description?: string })?.description ||
                              "-";
                            const city =
                              record.city ||
                              (record.raw_data as { city?: string })?.city ||
                              "-";
                            const country =
                              record.country ||
                              (record.raw_data as { country?: string })?.country ||
                              "-";
                            const isActive =
                              record.is_active !== undefined
                                ? record.is_active
                                : ((record.raw_data as { is_active?: boolean })?.is_active ?? true);

                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.eitje_id || record.id || "-"}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell className="max-w-xs truncate">{description}</TableCell>
                                <TableCell>{city}</TableCell>
                                <TableCell>{country}</TableCell>
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
                  <div className="mt-16">
                    <ShowMoreColumnsToggle
                      isExpanded={showAllColumnsTeams}
                      onToggle={setShowAllColumnsTeams}
                      coreColumnCount={7}
                      totalColumnCount={7}
                    />
                  </div>
                  <div className="mt-4 bg-white rounded-sm border border-black px-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-semibold">Eitje ID</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">Description</TableHead>
                          <TableHead className="font-semibold">Environment ID</TableHead>
                          <TableHead className="font-semibold">Team Type</TableHead>
                          <TableHead className="font-semibold">Active</TableHead>
                          <TableHead className="font-semibold">Created At</TableHead>
                          {/* Additional columns (team_type, code, updated_at) will be available after migrations run */}
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
                          teamsData.records.map((record) => {
                            const name =
                              record.name ||
                              (record.raw_data as { name?: string })?.name ||
                              "-";
                            const description =
                              record.description ||
                              (record.raw_data as { description?: string })?.description ||
                              "-";
                            const teamType =
                              record.team_type ||
                              (record.raw_data as { team_type?: string; teamType?: string })?.team_type ||
                              (record.raw_data as { teamType?: string })?.teamType ||
                              "-";
                            const isActive =
                              record.is_active !== undefined
                                ? record.is_active
                                : ((record.raw_data as { is_active?: boolean })?.is_active ?? true);

                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.eitje_id || record.id || "-"}</TableCell>
                                <TableCell>{name}</TableCell>
                                <TableCell className="max-w-xs truncate">{description}</TableCell>
                                <TableCell>{record.environment_id || "-"}</TableCell>
                                <TableCell>{teamType}</TableCell>
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
