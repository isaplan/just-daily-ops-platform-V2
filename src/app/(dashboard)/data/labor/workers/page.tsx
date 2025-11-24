/**
 * Workers V2 View Layer (Merged with Locations-Teams functionality)
 * Pure presentational component - all business logic is in ViewModel
 * Uses GraphQL for data operations
 * Features: CRUD operations, Tabs (All, Active, Inactive, No Team, Duplicates, Ghost, Missing Wage), Team filter
 */

"use client";

import { useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { UITable } from "@/components/view-data/UITable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorkersV2ViewModel } from "@/viewmodels/workforce/useWorkersV2ViewModel";
import { WorkerProfile } from "@/models/workforce/workers-v2.model";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Edit, Trash2, Save, X, Users, UserCheck, UserX, Copy, Ghost as GhostIcon, AlertCircle } from "lucide-react";
import { AutocompleteSearch, AutocompleteOption } from "@/components/view-data/AutocompleteSearch";
import { ClickableWorkerName } from "@/components/workforce/ClickableWorkerName";

export default function WorkersV2Page() {
  const viewModel = useWorkersV2ViewModel();
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [workerSearch, setWorkerSearch] = useState<string>("");
  const [workerEditSearch, setWorkerEditSearch] = useState<string>("");

  // Get all unique teams from workers data
  const allTeams = useMemo(() => {
    if (!viewModel.sortedRecords) return [];
    
    const teamsMap = new Map<string, { name: string; locationIds: Set<string> }>();
    
    viewModel.sortedRecords.forEach((worker: WorkerProfile) => {
      const workerLocationId = worker.locationId || worker.location_id;
      
      if (worker.teams && Array.isArray(worker.teams)) {
        worker.teams.forEach((team: any) => {
          if (team.team_name) {
            if (!teamsMap.has(team.team_name)) {
              teamsMap.set(team.team_name, { name: team.team_name, locationIds: new Set() });
            }
            if (workerLocationId) {
              teamsMap.get(team.team_name)!.locationIds.add(workerLocationId);
            }
          }
        });
      } else if (worker.teamName) {
        if (!teamsMap.has(worker.teamName)) {
          teamsMap.set(worker.teamName, { name: worker.teamName, locationIds: new Set() });
        }
        if (workerLocationId) {
          teamsMap.get(worker.teamName)!.locationIds.add(workerLocationId);
        }
      }
    });
    
    return Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [viewModel.sortedRecords]);

  // Filter teams by selected location (in edit mode)
  const [selectedLocationForEdit, setSelectedLocationForEdit] = useState<string>("");
  
  const getTeamsForLocation = (locationId: string) => {
    if (!locationId || locationId === "all") return allTeams;
    return allTeams.filter(team => team.locationIds.has(locationId));
  };
  
  // Team options for filter (all teams)
  const teamOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Teams" }];
    allTeams.forEach(team => {
      options.push({ value: team.name, label: team.name });
    });
    return options;
  }, [allTeams]);

  // Worker search options for autocomplete
  const workerSearchOptions = useMemo<AutocompleteOption[]>(() => {
    if (!viewModel.sortedRecords) return [];
    return viewModel.sortedRecords.map((w: WorkerProfile) => ({
      value: w.userName || `User ${w.eitjeUserId}`,
      label: w.userName || `User ${w.eitjeUserId}`,
      eitjeUserId: w.eitjeUserId,
      id: w.id,
    }));
  }, [viewModel.sortedRecords]);

  // Filter workers based on active tab, team filter, and search
  const filteredWorkers = useMemo(() => {
    if (!viewModel.sortedRecords) return [];
    
    let workers = [...viewModel.sortedRecords];
    
    // Apply worker search filter
    if (workerSearch && workerSearch.trim()) {
      const searchLower = workerSearch.toLowerCase().trim();
      workers = workers.filter((w: WorkerProfile) => {
        const name = (w.userName || '').toLowerCase();
        const eitjeId = String(w.eitjeUserId || '');
        return name.includes(searchLower) || eitjeId.includes(searchLower);
      });
    }
    
    // Apply tab filter
    switch (activeTab) {
      case "active":
        workers = workers.filter((w: WorkerProfile) => {
          const now = new Date();
          const hasEndedContract = w.effectiveTo && new Date(w.effectiveTo) < now;
          const hasNoWage = !w.hourlyWage || w.hourlyWage === 0;
          return !hasEndedContract && !hasNoWage;
        });
        break;
      
      case "inactive":
        workers = workers.filter((w: WorkerProfile) => {
          const now = new Date();
          const hasEndedContract = w.effectiveTo && new Date(w.effectiveTo) < now;
          const hasNoWage = !w.hourlyWage || w.hourlyWage === 0;
          return hasEndedContract || hasNoWage;
        });
        break;
      
      case "no-team":
        workers = workers.filter((w: WorkerProfile) => {
          const hasTeams = w.teams && Array.isArray(w.teams) && w.teams.length > 0;
          return !hasTeams && !w.teamName;
        });
        break;
      
      case "duplicates":
        // Find workers with duplicate names (alphabetically sorted)
        const nameMap = new Map<string, WorkerProfile[]>();
        workers.forEach(worker => {
          const name = (worker.userName || '').toLowerCase().trim();
          if (!name) return;
          if (!nameMap.has(name)) nameMap.set(name, []);
          nameMap.get(name)!.push(worker);
        });
        
        workers = Array.from(nameMap.entries())
          .filter(([_, workers]) => workers.length > 1)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .flatMap(([_, workers]) => workers);
        break;
      
      case "ghost":
        // Workers without teams (no shifts)
        workers = workers.filter((w: WorkerProfile) => {
          const hasTeams = w.teams && Array.isArray(w.teams) && w.teams.length > 0;
          return !hasTeams && !w.teamName;
        });
        break;
      
      case "missing-wage":
        // Workers with missing hourly wage
        workers = workers.filter((w: WorkerProfile) => {
          return !w.hourlyWage || w.hourlyWage === 0;
        });
        break;
    }
    
    // Apply team filter
    if (teamFilter !== "all") {
      workers = workers.filter((w: WorkerProfile) => {
        if (w.teams && Array.isArray(w.teams)) {
          return w.teams.some((team: any) => team.team_name === teamFilter);
        }
        return w.teamName === teamFilter;
      });
    }
    
    return workers;
  }, [viewModel.sortedRecords, activeTab, teamFilter, workerSearch]);

  // Count workers for each tab
  const tabCounts = useMemo(() => {
    if (!viewModel.sortedRecords) return { all: 0, active: 0, inactive: 0, noTeam: 0, ghost: 0, missingWage: 0 };
    
    const all = viewModel.sortedRecords.length;
    const active = viewModel.sortedRecords.filter((w: WorkerProfile) => {
      const now = new Date();
      const hasEndedContract = w.effectiveTo && new Date(w.effectiveTo) < now;
      const hasNoWage = !w.hourlyWage || w.hourlyWage === 0;
      return !hasEndedContract && !hasNoWage;
    }).length;
    const inactive = all - active;
    const noTeam = viewModel.sortedRecords.filter((w: WorkerProfile) => {
      const hasTeams = w.teams && Array.isArray(w.teams) && w.teams.length > 0;
      return !hasTeams && !w.teamName;
    }).length;
    const ghost = noTeam; // Same as no-team for now
    const missingWage = viewModel.sortedRecords.filter((w: WorkerProfile) => {
      return !w.hourlyWage || w.hourlyWage === 0;
    }).length;
    
    return { all, active, inactive, noTeam, ghost, missingWage };
  }, [viewModel.sortedRecords]);

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
          selectedDatePreset="this-year"
          onYearChange={viewModel.setSelectedYear}
          onMonthChange={viewModel.setSelectedMonth}
          onDayChange={viewModel.setSelectedDay}
          onLocationChange={viewModel.setSelectedLocation}
          onDatePresetChange={() => {}}
          locations={viewModel.locationOptions}
        />

        {/* Filters Row */}
        <div className="flex gap-6 flex-wrap items-end">
          {/* Worker Search with Autocomplete */}
          <AutocompleteSearch
            options={workerSearchOptions}
            value={workerSearch}
            onValueChange={setWorkerSearch}
            placeholder="Search worker..."
            label="Search Worker"
            emptyMessage="No workers found."
            filterFn={(option, search) => {
              const searchLower = search.toLowerCase();
              const name = option.label.toLowerCase();
              const eitjeId = String(option.eitjeUserId || '').toLowerCase();
              return name.includes(searchLower) || eitjeId.includes(searchLower);
            }}
            renderOption={(option) => (
              <div>
                <div className="font-medium">{option.label}</div>
                {option.eitjeUserId && (
                  <div className="text-xs text-muted-foreground">ID: {option.eitjeUserId}</div>
                )}
              </div>
            )}
            className="min-w-[250px]"
          />
          
          {/* Team Filter */}
          <LocationFilterButtons
            options={teamOptions}
            selectedValue={teamFilter}
            onValueChange={setTeamFilter}
            label="Team"
          />

          {/* Contract Type Filter */}
          <LocationFilterButtons
            options={[
              { value: "all", label: "All Types" },
              { value: "flex", label: "Flex" },
              { value: "contract", label: "Contract" },
              { value: "zzp", label: "ZZP" },
              { value: "nul uren", label: "Nul Uren" },
            ]}
            selectedValue={viewModel.contractTypeFilter}
            onValueChange={viewModel.setContractTypeFilter}
            label="Contract Type"
          />
        </div>

        {/* Tabs for Worker Categories */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              All Workers
              <Badge variant="secondary" className="ml-1">{tabCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Active
              <Badge variant="secondary" className="ml-1">{tabCounts.active}</Badge>
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Inactive
              <Badge variant="secondary" className="ml-1">{tabCounts.inactive}</Badge>
            </TabsTrigger>
            <TabsTrigger value="no-team" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              No Team
              <Badge variant="secondary" className="ml-1">{tabCounts.noTeam}</Badge>
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Duplicates
            </TabsTrigger>
            <TabsTrigger value="ghost" className="flex items-center gap-2">
              <GhostIcon className="h-4 w-4" />
              Ghost
              <Badge variant="secondary" className="ml-1">{tabCounts.ghost}</Badge>
            </TabsTrigger>
            <TabsTrigger value="missing-wage" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Missing Wage
              <Badge variant="secondary" className="ml-1">{tabCounts.missingWage}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
              <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => viewModel.setShowAllColumns(!viewModel.showAllColumns)}
          >
            {viewModel.showAllColumns ? "Hide" : "Show"} All Columns
          </Button>
              <div className="text-sm text-muted-foreground flex items-center">
                Showing <strong className="mx-1">{filteredWorkers.length}</strong> of <strong className="mx-1">{tabCounts.all}</strong> workers
              </div>
            </div>
            
            {/* Worker Search Dropdown for Quick Edit */}
            <div className="w-[300px]">
              <AutocompleteSearch
                options={filteredWorkers.map((w: WorkerProfile) => ({
                  value: w.id,
                  label: `${w.userName || `User ${w.eitjeUserId}`} - ${w.locationName || "No Location"}`,
                  id: w.id,
                }))}
                value={workerEditSearch}
                onValueChange={(value) => {
                  setWorkerEditSearch(value);
                  if (value) {
                    // Find the worker and start editing
                    const worker = filteredWorkers.find((w: WorkerProfile) => w.id === value);
                    if (worker) {
                      viewModel.handleEdit(worker);
                      // Scroll to the worker row
                      setTimeout(() => {
                        const rowElement = document.querySelector(`[data-worker-id="${value}"]`);
                        if (rowElement) {
                          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                      // Clear the search after selection
                      setWorkerEditSearch("");
                    }
                  }
                }}
                placeholder="Search worker to edit..."
                emptyMessage="No workers found."
                className="min-w-[300px]"
              />
            </div>
        </div>

        {/* Workers Table */}
        {viewModel.isLoading && <LoadingState />}

        {viewModel.error && (
          <ErrorState error={viewModel.error} message="Error loading worker profiles" />
        )}

        {!viewModel.isLoading && !viewModel.error && viewModel.data && (
          <>
            <UITable stickyHeader={true} stickyFirstColumn={true}>
              <TableHeader className="!sticky !top-0">
                <TableRow>
                  {activeTab === "duplicates" && <TableHead className="font-semibold">Merge</TableHead>}
                  <TableHead 
                    className="font-semibold cursor-pointer hover:bg-muted/50"
                    onClick={viewModel.handleNameSort}
                  >
                    Name {viewModel.nameSortOrder === "asc" ? "↑" : viewModel.nameSortOrder === "desc" ? "↓" : ""}
                  </TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Teams</TableHead>
                    <TableHead className="font-semibold">Contract</TableHead>
                    <TableHead className="font-semibold">Contract Hours</TableHead>
                    <TableHead className="font-semibold">Hourly Wage (€)</TableHead>
                  {viewModel.showAllColumns && (
                    <>
                      <TableHead className="font-semibold">Contract Start</TableHead>
                      <TableHead className="font-semibold">Contract End</TableHead>
                      <TableHead className="font-semibold">Wage Override</TableHead>
                    </>
                  )}
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold">Eitje User ID</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {/* Create New Row */}
                {viewModel.isCreating && viewModel.editingProfile && (
                  <TableRow className="bg-blue-50">
                    {activeTab === "duplicates" && <TableCell></TableCell>}
                    <TableCell>
                      <Input
                        value={viewModel.editingProfile.userName || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          userName: e.target.value 
                        })}
                        placeholder="Name (auto-filled)"
                        className="w-full"
                        disabled
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={viewModel.editingProfile.locationId || ""}
                        onChange={(e) => {
                          viewModel.setEditingProfile({ 
                            ...viewModel.editingProfile!, 
                            locationId: e.target.value,
                            teamName: "" // Reset team when location changes
                          });
                          setSelectedLocationForEdit(e.target.value);
                        }}
                        className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">Select Location</option>
                        {viewModel.locationOptions.filter(loc => loc.value !== "all").map(loc => (
                          <option key={loc.value} value={loc.value}>{loc.label}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        value={viewModel.editingProfile.teamName || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          teamName: e.target.value 
                        })}
                        className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                        disabled={!viewModel.editingProfile.locationId}
                      >
                        <option value="">Select Team (optional)</option>
                        {getTeamsForLocation(viewModel.editingProfile.locationId || "").map(team => (
                          <option key={team.name} value={team.name}>{team.name}</option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        value={viewModel.editingProfile.contractType || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          contractType: e.target.value 
                        })}
                        className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">Select Type</option>
                        <option value="Flexible">Flex</option>
                        <option value="zzp">ZZP</option>
                        <option value="nul uren">Nul Uren</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={viewModel.editingProfile.contractHours || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          contractHours: parseFloat(e.target.value) || null 
                        })}
                        placeholder="Hours"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={viewModel.editingProfile.hourlyWage || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          hourlyWage: parseFloat(e.target.value) || null 
                        })}
                        placeholder="Wage"
                        className="w-full"
                      />
                    </TableCell>
                    {viewModel.showAllColumns && (
                      <>
                        <TableCell>
                          <Input
                            type="date"
                            value={viewModel.editingProfile.effectiveFrom?.split('T')[0] || ""}
                            onChange={(e) => viewModel.setEditingProfile({ 
                              ...viewModel.editingProfile!, 
                              effectiveFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                            })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={viewModel.editingProfile.effectiveTo?.split('T')[0] || ""}
                            onChange={(e) => viewModel.setEditingProfile({ 
                              ...viewModel.editingProfile!, 
                              effectiveTo: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                            })}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={viewModel.editingProfile.wageOverride}
                            onChange={(e) => viewModel.setEditingProfile({ 
                              ...viewModel.editingProfile!, 
                              wageOverride: e.target.checked 
                            })}
                          />
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <select
                        value={viewModel.editingProfile.isActive ? "active" : "inactive"}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          isActive: e.target.value === "active"
                        })}
                        className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={viewModel.editingProfile.notes || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          notes: e.target.value 
                        })}
                        placeholder="Notes"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={viewModel.editingProfile.eitjeUserId || ""}
                        onChange={(e) => viewModel.setEditingProfile({ 
                          ...viewModel.editingProfile!, 
                          eitjeUserId: parseInt(e.target.value) || 0 
                        })}
                        placeholder="Eitje User ID"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={viewModel.handleSave}
                          disabled={viewModel.createMutation.isPending}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={viewModel.handleCancel}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Data Rows */}
                {filteredWorkers && filteredWorkers.length > 0 ? (
                  filteredWorkers.map((record: WorkerProfile, index: number) => {
                    // Check if this is a duplicate row
                    const isDuplicateRow = activeTab === "duplicates";
                    const workerName = (record.userName || '').toLowerCase().trim();
                    const hasDuplicates = filteredWorkers.filter((w: WorkerProfile) => 
                      (w.userName || '').toLowerCase().trim() === workerName && w.id !== record.id
                    ).length > 0;
                    
                    // Add visual grouping for duplicates
                    const isFirstInGroup = index === 0 || 
                      (record.userName || '').toLowerCase().trim() !== 
                      (filteredWorkers[index - 1]?.userName || '').toLowerCase().trim();
                    
                    return (
                    <TableRow 
                      key={record.id}
                      data-worker-id={record.id}
                      className={activeTab === "duplicates" && isFirstInGroup && index > 0 ? "border-t-2 border-t-primary/20" : ""}
                    >
                      {viewModel.editingId === record.id && viewModel.editingProfile ? (
                        // Edit Mode
                        <>
                          {activeTab === "duplicates" && <TableCell></TableCell>}
                          <TableCell>
                            <Input
                              value={viewModel.editingProfile.userName || ""}
                              disabled
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              value={viewModel.editingProfile.locationId || ""}
                              onChange={(e) => {
                                viewModel.setEditingProfile({ 
                                  ...viewModel.editingProfile!, 
                                  locationId: e.target.value,
                                  teamName: "" // Reset team when location changes
                                });
                                setSelectedLocationForEdit(e.target.value);
                              }}
                              className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                            >
                              <option value="">Select Location</option>
                              {viewModel.locationOptions.filter(loc => loc.value !== "all").map(loc => (
                                <option key={loc.value} value={loc.value}>{loc.label}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              value={viewModel.editingProfile.teamName || ""}
                              onChange={(e) => viewModel.setEditingProfile({ 
                                ...viewModel.editingProfile!, 
                                teamName: e.target.value 
                              })}
                              className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                              disabled={!viewModel.editingProfile.locationId}
                            >
                              <option value="">Select Team (optional)</option>
                              {getTeamsForLocation(viewModel.editingProfile.locationId || "").map(team => (
                                <option key={team.name} value={team.name}>{team.name}</option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            <select
                              value={viewModel.editingProfile.contractType || ""}
                              onChange={(e) => viewModel.setEditingProfile({ 
                                ...viewModel.editingProfile!, 
                                contractType: e.target.value 
                              })}
                              className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                            >
                              <option value="">Select Type</option>
                              <option value="Flexible">Flex</option>
                              <option value="zzp">ZZP</option>
                              <option value="nul uren">Nul Uren</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={viewModel.editingProfile.contractHours || ""}
                              onChange={(e) => viewModel.setEditingProfile({ 
                                ...viewModel.editingProfile!, 
                                contractHours: parseFloat(e.target.value) || null 
                              })}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={viewModel.editingProfile.hourlyWage || ""}
                              onChange={(e) => viewModel.setEditingProfile({ 
                                ...viewModel.editingProfile!, 
                                hourlyWage: parseFloat(e.target.value) || null 
                              })}
                              className="w-full"
                            />
                          </TableCell>
                          {viewModel.showAllColumns && (
                            <>
                              <TableCell>
                                <Input
                                  type="date"
                                  value={viewModel.editingProfile.effectiveFrom?.split('T')[0] || ""}
                                  onChange={(e) => viewModel.setEditingProfile({ 
                                    ...viewModel.editingProfile!, 
                                    effectiveFrom: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                                  })}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="date"
                                  value={viewModel.editingProfile.effectiveTo?.split('T')[0] || ""}
                                  onChange={(e) => viewModel.setEditingProfile({ 
                                    ...viewModel.editingProfile!, 
                                    effectiveTo: e.target.value ? new Date(e.target.value).toISOString() : undefined 
                                  })}
                                  className="w-full"
                                />
                              </TableCell>
                              <TableCell>
                                <input
                                  type="checkbox"
                                  checked={viewModel.editingProfile.wageOverride}
                                  onChange={(e) => viewModel.setEditingProfile({ 
                                    ...viewModel.editingProfile!, 
                                    wageOverride: e.target.checked 
                                  })}
                                />
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <select
                              value={viewModel.editingProfile.isActive ? "active" : "inactive"}
                              onChange={(e) => viewModel.setEditingProfile({ 
                                ...viewModel.editingProfile!, 
                                isActive: e.target.value === "active"
                              })}
                              className="w-full border rounded p-2 bg-white text-black dark:bg-gray-800 dark:text-white"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={viewModel.editingProfile.notes || ""}
                              onChange={(e) => viewModel.setEditingProfile({ 
                                ...viewModel.editingProfile!, 
                                notes: e.target.value 
                              })}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={viewModel.editingProfile.eitjeUserId}
                              disabled
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={viewModel.handleSave}
                                disabled={viewModel.updateMutation.isPending}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={viewModel.handleCancel}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        // View Mode
                        <>
                          {/* Merge Button (Duplicates tab only) */}
                          {activeTab === "duplicates" && (
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  alert(`Merge functionality coming soon!\nWorker: ${record.userName} (ID: ${record.eitjeUserId})`);
                                }}
                                disabled={!hasDuplicates}
                              >
                                Merge
                              </Button>
                            </TableCell>
                          )}
                          
                          <TableCell>
                            <ClickableWorkerName worker={record} />
                          </TableCell>
                          <TableCell>{record.locationName || record.locationId || "-"}</TableCell>
                          <TableCell>
                            {record.teams && Array.isArray(record.teams) && record.teams.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {record.teams.map((team: any, idx: number) => (
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
                            ) : record.teamName ? (
                              <Badge variant="default" className="text-xs">{record.teamName}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {record.contractType 
                              ? record.contractType.toLowerCase() === "flexible" 
                                ? "Flex" 
                                : record.contractType 
                              : "-"}
                          </TableCell>
                          <TableCell>{record.contractHours ? record.contractHours.toFixed(2) : "-"}</TableCell>
                          <TableCell>{record.hourlyWage ? `€${record.hourlyWage.toFixed(2)}` : "-"}</TableCell>
                          {viewModel.showAllColumns && (
                            <>
                              <TableCell>
                                {record.effectiveFrom 
                                  ? new Date(record.effectiveFrom).toLocaleDateString('nl-NL') 
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {record.effectiveTo 
                                  ? new Date(record.effectiveTo).toLocaleDateString('nl-NL') 
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                {record.wageOverride ? "✓" : "-"}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            {(() => {
                              // Determine active status based on contract end date and hourly wage
                              const now = new Date();
                              const hasEndedContract = record.effectiveTo && new Date(record.effectiveTo) < now;
                              const hasNoWage = !record.hourlyWage || record.hourlyWage === 0;
                              const isActive = !hasEndedContract && !hasNoWage;
                              
                              return (
                                <span className={isActive ? "text-green-600 font-medium" : "text-gray-400"}>
                                  {isActive ? "Active" : "Inactive"}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell>{record.notes || "-"}</TableCell>
                          <TableCell>{record.eitjeUserId}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewModel.handleEdit(record)}
                                disabled={viewModel.isCreating || viewModel.editingId !== null}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => viewModel.handleDelete(record.id)}
                                disabled={viewModel.isCreating || viewModel.editingId !== null || viewModel.deleteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell 
                      colSpan={activeTab === "duplicates" ? (viewModel.showAllColumns ? 15 : 12) : (viewModel.showAllColumns ? 14 : 11)} 
                      className="text-center py-8 text-muted-foreground"
                    >
                      {activeTab === "no-team" && "No workers without teams"}
                      {activeTab === "duplicates" && "No duplicate workers found"}
                      {activeTab === "ghost" && "No ghost workers (all have shifts)"}
                      {activeTab === "active" && "No active workers"}
                      {activeTab === "inactive" && "No inactive workers"}
                      {(activeTab === "all" && filteredWorkers.length === 0) && "No worker profiles found"}
                    </TableCell>
                  </TableRow>
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


