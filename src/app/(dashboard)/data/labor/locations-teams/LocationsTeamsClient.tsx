/**
 * Labor Locations & Teams - Client Component
 * Handles all interactivity - receives initial data from Server Component
 * 
 * Displays workers filtered by location, team, and contract type
 * Shows active filter labels as dynamic title
 * Supports workers in multiple teams
 */

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { useLocationsTeamsViewModel } from "@/viewmodels/labor/useLocationsTeamsViewModel";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Users, UserX, Copy, Ghost } from "lucide-react";
import { ClickableWorkerName } from "@/components/workforce/ClickableWorkerName";

interface LocationsTeamsClientProps {
  initialData?: {
    workersData?: any;
    locations?: any[];
    teams?: any[];
  };
}

export function LocationsTeamsClient({ initialData }: LocationsTeamsClientProps) {
  const viewModel = useLocationsTeamsViewModel(initialData);
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  const [activeTab, setActiveTab] = useState("all");

  // Filter workers based on active tab
  const getFilteredWorkers = () => {
    if (!viewModel.workersData?.records) return [];
    
    const workers = viewModel.workersData.records;
    
    switch (activeTab) {
      case "no-team":
        return workers.filter(w => !w.teams || w.teams.length === 0);
      
      case "duplicates":
        // Find workers with similar names (alphabetically sorted)
        const nameMap = new Map<string, typeof workers>();
        workers.forEach(worker => {
          const name = (worker.user_name || '').toLowerCase().trim();
          if (!name) return;
          if (!nameMap.has(name)) {
            nameMap.set(name, []);
          }
          nameMap.get(name)!.push(worker);
        });
        
        // Only return names with duplicates, sorted alphabetically
        const duplicates = Array.from(nameMap.entries())
          .filter(([_, workers]) => workers.length > 1)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .flatMap(([_, workers]) => workers);
        
        return duplicates;
      
      case "ghost":
        // Workers without teams (no shifts)
        return workers.filter(w => !w.teams || w.teams.length === 0);
      
      default: // "all"
        return workers;
    }
  };

  const filteredWorkers = getFilteredWorkers();

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
          selectedDay={null}
          selectedLocation={viewModel.selectedLocation}
          selectedDatePreset="this-year"
          onYearChange={viewModel.setSelectedYear}
          onMonthChange={viewModel.setSelectedMonth}
          onDayChange={() => {}}
          onLocationChange={viewModel.setSelectedLocation}
          onDatePresetChange={() => {}}
          locations={viewModel.locationOptions.map(loc => ({ value: loc.id, label: loc.name }))}
        />

        {/* Team and Contract Type Filters */}
        <div className="flex gap-6 flex-wrap">
          <LocationFilterButtons
            options={viewModel.teamOptions.map(team => ({ value: team.id, label: team.name }))}
            selectedValue={viewModel.selectedTeam}
            onValueChange={viewModel.setSelectedTeam}
            label="Team"
          />
          <LocationFilterButtons
            options={viewModel.contractTypeOptions}
            selectedValue={viewModel.selectedContractType}
            onValueChange={viewModel.setSelectedContractType}
            label="Contract Type"
          />
        </div>

        {/* Tabs for Worker Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Workers
              <Badge variant="secondary" className="ml-1">{viewModel.workersData?.total || 0}</Badge>
            </TabsTrigger>
            <TabsTrigger value="no-team" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              No Team
              <Badge variant="secondary" className="ml-1">
                {viewModel.workersData?.records.filter(w => !w.teams || w.teams.length === 0).length || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Duplicates
            </TabsTrigger>
            <TabsTrigger value="ghost" className="flex items-center gap-2">
              <Ghost className="h-4 w-4" />
              Ghost Workers
              <Badge variant="secondary" className="ml-1">
                {viewModel.workersData?.records.filter(w => !w.teams || w.teams.length === 0).length || 0}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {/* Results Summary */}
            <div className="text-sm text-muted-foreground">
              <strong>{viewModel.dynamicTitle}</strong> - {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} found
            </div>

            {/* Workers Table */}
            {viewModel.isLoading && <LoadingState />}

            {viewModel.error && (
              <ErrorState error={viewModel.error} message="Error loading worker data" />
            )}

            {!viewModel.isLoading && !viewModel.error && viewModel.workersData && (
              <>
                <UITable>
              <TableHeader>
                <TableRow>
                  {activeTab === "duplicates" && <TableHead className="font-semibold">Actions</TableHead>}
                  <TableHead className="font-semibold">Worker</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Teams</TableHead>
                  <TableHead className="font-semibold">Contract Type</TableHead>
                  <TableHead className="font-semibold">Contract Hours</TableHead>
                  <TableHead className="font-semibold">Hourly Wage</TableHead>
                  <TableHead className="font-semibold">Contract Period</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "duplicates" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      {activeTab === "no-team" && "No workers without teams"}
                      {activeTab === "duplicates" && "No duplicate workers found"}
                      {activeTab === "ghost" && "No ghost workers (all have shifts)"}
                      {activeTab === "all" && "No workers found matching the selected filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkers.map((worker, index) => {
                    // Check if this is a duplicate row (show merge button)
                    const isDuplicateRow = activeTab === "duplicates";
                    const workerName = (worker.user_name || '').toLowerCase().trim();
                    const hasDuplicates = filteredWorkers.filter(w => 
                      (w.user_name || '').toLowerCase().trim() === workerName && w.id !== worker.id
                    ).length > 0;
                    
                    // Add visual grouping for duplicates
                    const isFirstInGroup = index === 0 || 
                      (worker.user_name || '').toLowerCase().trim() !== 
                      (filteredWorkers[index - 1]?.user_name || '').toLowerCase().trim();
                    
                    return (
                    <TableRow 
                      key={`${worker.id}-${index}`}
                      className={activeTab === "duplicates" && isFirstInGroup && index > 0 ? "border-t-2 border-t-primary/20" : ""}
                    >
                      {/* Merge Actions (Duplicates tab only) */}
                      {activeTab === "duplicates" && (
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              alert(`Merge functionality coming soon!\nWorker: ${worker.user_name} (ID: ${worker.eitje_user_id})`);
                            }}
                            disabled={!hasDuplicates}
                          >
                            Merge
                          </Button>
                        </TableCell>
                      )}
                      
                      <TableCell>
                        <ClickableWorkerName worker={worker} showId />
                      </TableCell>
                      <TableCell>{worker.location_name || worker.location_id || "-"}</TableCell>
                      <TableCell>
                        {worker.teams && worker.teams.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {worker.teams.map((team, idx) => (
                              <Badge
                                key={`${team.team_id}-${idx}`}
                                variant={team.is_active ? "default" : "outline"}
                                className={`text-xs ${!team.is_active ? 'opacity-60' : ''}`}
                                title={team.is_active ? 'Current team' : 'Historical team (from past shifts)'}
                              >
                                {team.team_name}
                                {!team.is_active && <span className="ml-1 text-[10px]">📅</span>}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {worker.contract_type ? (
                          <Badge variant="outline">
                            {worker.contract_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {worker.contract_hours ? `${worker.contract_hours.toFixed(1)}h` : "-"}
                      </TableCell>
                      <TableCell>
                        {worker.hourly_wage ? (
                          <div className="flex items-center gap-1">
                            <span>€{worker.hourly_wage.toFixed(2)}</span>
                            {worker.wage_override && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                Override
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {worker.effective_from ? (
                            <>
                              <div>{formatDateDDMMYY(worker.effective_from)}</div>
                              {worker.effective_to && (
                                <div className="text-xs text-muted-foreground">
                                  to {formatDateDDMMYY(worker.effective_to)}
                                </div>
                              )}
                              {!worker.effective_to && (
                                <div className="text-xs text-green-600">Active</div>
                              )}
                            </>
                          ) : (
                            "-"
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </UITable>

            {/* Pagination */}
            <SimplePagination
              currentPage={viewModel.currentPage}
              totalPages={viewModel.totalPages}
              totalRecords={filteredWorkers.length}
              onPageChange={viewModel.setCurrentPage}
              isLoading={viewModel.isLoading}
            />
          </>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}









