/**
 * Worker Profile Sheet Content Component
 * Reusable content component used in both Sheet (mobile) and ResizablePanel (desktop)
 */

"use client";

import { useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useWorkerProfileViewModel } from "@/viewmodels/workforce/useWorkerProfileViewModel";
import { useWorkerProfileSheet } from "@/contexts/WorkerProfileSheetContext";
import { Edit, Save, X, Euro, Clock } from "lucide-react";

export function WorkerProfileSheetContent() {
  const { selectedWorker, closeWorkerSheet } = useWorkerProfileSheet();
  const viewModel = useWorkerProfileViewModel(selectedWorker);

  if (!selectedWorker) return null;

  // Calculate contract status
  const isContractActive = useMemo(() => {
    if (!selectedWorker.effectiveTo) return true; // No end date = active
    const endDate = new Date(selectedWorker.effectiveTo);
    return endDate > new Date(); // Active if end date is in the future
  }, [selectedWorker.effectiveTo]);

  // Format date as DD.MM'YY
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}.${month}'${year}`;
    } catch {
      return "-";
    }
  };

  // Calculate contract duration in months
  const calculateDuration = (): string => {
    if (!selectedWorker.effectiveFrom) return "-";
    const startDate = new Date(selectedWorker.effectiveFrom);
    const endDate = selectedWorker.effectiveTo 
      ? new Date(selectedWorker.effectiveTo) 
      : new Date();
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                   (endDate.getMonth() - startDate.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0 && remainingMonths > 0) {
      return `${years}y ${remainingMonths}m`;
    } else if (years > 0) {
      return `${years}y`;
    } else {
      return `${months}m`;
    }
  };

  // Calculate monthly hours from weekly hours
  const monthlyHours = useMemo(() => {
    if (!selectedWorker.contractHours) return null;
    // Average weeks per month = 4.33
    return Math.round(selectedWorker.contractHours * 4.33 * 10) / 10;
  }, [selectedWorker.contractHours]);

  // Get selected location IDs for team fetching
  const selectedLocationIds = useMemo(() => {
    if (viewModel.isEditMode && viewModel.editingProfile?.locationIds && Array.isArray(viewModel.editingProfile.locationIds) && viewModel.editingProfile.locationIds.length > 0) {
      return viewModel.editingProfile.locationIds;
    }
    if (selectedWorker.locationIds && Array.isArray(selectedWorker.locationIds) && selectedWorker.locationIds.length > 0) {
      return selectedWorker.locationIds;
    }
    if (selectedWorker.locationId) {
      return [selectedWorker.locationId];
    }
    return [];
  }, [viewModel.isEditMode, viewModel.editingProfile?.locationIds, selectedWorker.locationIds, selectedWorker.locationId]);

  // Force period to "total" if contract is inactive
  useEffect(() => {
    if (!isContractActive) {
      if (viewModel.performancePeriod !== "total") {
        viewModel.setPerformancePeriod("total");
      }
      if (viewModel.laborCostPeriod !== "total") {
        viewModel.setLaborCostPeriod("total");
      }
    }
  }, [isContractActive, viewModel.performancePeriod, viewModel.laborCostPeriod, viewModel.setPerformancePeriod, viewModel.setLaborCostPeriod]);

  return (
    <>
      {/* Header - Matching Filter Sidebar */}
      <div className="sticky top-0 z-10 bg-white border-b border-sidebar-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {selectedWorker.userName || `User ${selectedWorker.eitjeUserId}`}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={closeWorkerSheet}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close profile</span>
          </Button>
        </div>
        
        {/* Edit/Cancel/Save Buttons */}
        {!viewModel.isEditMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={viewModel.handleEdit}
            className="w-full"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={viewModel.handleCancel}
              disabled={viewModel.updateMutation.isPending}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={viewModel.handleSave}
              disabled={viewModel.updateMutation.isPending}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Content - Matching Filter Sidebar */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
        <div className="space-y-6">
          {/* Profile Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Profile Information</h3>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                Full Name
              </Label>
              {viewModel.isEditMode ? (
                <Input
                  id="name"
                  value={viewModel.editingProfile?.userName || ""}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <p className="text-sm font-medium">{selectedWorker.userName || `User ${selectedWorker.eitjeUserId}`}</p>
              )}
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <Label htmlFor="contractType" className="text-xs font-medium text-muted-foreground">
                Contract Type
              </Label>
              {viewModel.isEditMode ? (
                <select
                  id="contractType"
                  value={
                    viewModel.editingProfile?.contractType?.toLowerCase().includes("uren contract")
                      ? "Contract"
                      : viewModel.editingProfile?.contractType || ""
                  }
                  onChange={(e) => viewModel.setEditingProfile({
                    ...viewModel.editingProfile!,
                    contractType: e.target.value || null
                  })}
                  className="w-full border rounded-md px-3 py-2 bg-background text-sm"
                >
                  <option value="">Select Type</option>
                  <option value="Flexible">Flex</option>
                  <option value="Contract">Contract</option>
                  <option value="zzp">ZZP</option>
                  <option value="nul uren">Nul Uren</option>
                </select>
              ) : (
                <div>
                  {selectedWorker.contractType ? (
                    <Badge variant="secondary" className="text-xs">
                      {(() => {
                        const type = selectedWorker.contractType.toLowerCase();
                        if (type === "flexible") return "Flex";
                        if (type === "contract" || type.includes("uren contract")) return "Contract";
                        return selectedWorker.contractType;
                      })()}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              )}
            </div>

            {/* Contract Duration */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Contract Duration
              </Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-medium">{formatDate(selectedWorker.effectiveFrom)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-medium">{formatDate(selectedWorker.effectiveTo)}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{calculateDuration()}</span>
                </div>
              </div>
            </div>

            {/* Contract Status */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Contract Status
              </Label>
              <Badge variant={isContractActive ? "default" : "outline"} className="text-xs">
                {isContractActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Hourly Wage */}
            <div className="space-y-2">
              <Label htmlFor="hourlyWage" className="text-xs font-medium text-muted-foreground">
                Hourly Wage
              </Label>
              {viewModel.isEditMode ? (
                <Input
                  id="hourlyWage"
                  type="number"
                  step="0.01"
                  value={viewModel.editingProfile?.hourlyWage || ""}
                  onChange={(e) => viewModel.setEditingProfile({
                    ...viewModel.editingProfile!,
                    hourlyWage: parseFloat(e.target.value) || null
                  })}
                  placeholder="0.00"
                  className="text-sm"
                />
              ) : (
                <p className="text-sm font-semibold">
                  {selectedWorker.hourlyWage 
                    ? `€${selectedWorker.hourlyWage.toFixed(2)}` 
                    : <span className="text-muted-foreground font-normal">Not set</span>}
                </p>
              )}
            </div>

            {/* Contract Hours */}
            <div className="space-y-2">
              <Label htmlFor="contractHours" className="text-xs font-medium text-muted-foreground">
                Contract Hours
              </Label>
              {viewModel.isEditMode ? (
                <div className="space-y-2">
                  <Input
                    id="contractHours"
                    type="number"
                    step="0.1"
                    value={viewModel.editingProfile?.contractHours || ""}
                    onChange={(e) => {
                      const hours = parseFloat(e.target.value) || null;
                      viewModel.setEditingProfile({
                        ...viewModel.editingProfile!,
                        contractHours: hours
                      });
                    }}
                    placeholder="0.0"
                    className="text-sm"
                  />
                  {viewModel.editingProfile?.contractHours && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {Math.round(viewModel.editingProfile.contractHours * 4.33 * 10) / 10}h/month
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedWorker.contractHours ? (
                    <>
                      <p className="text-sm font-semibold">{selectedWorker.contractHours}h/week</p>
                      {monthlyHours && (
                        <p className="text-xs text-muted-foreground">≈ {monthlyHours}h/month</p>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not set</span>
                  )}
                </div>
              )}
            </div>

            {/* Contract Location */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Contract Location
              </Label>
              {viewModel.isEditMode ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                  {viewModel.locationOptions
                    .filter(loc => loc.value !== "all")
                    .map(loc => {
                      const currentIds = Array.isArray(viewModel.editingProfile?.locationIds) 
                        ? viewModel.editingProfile.locationIds 
                        : [];
                      const isSelected = currentIds.includes(loc.value);
                      return (
                        <div key={loc.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`location-${loc.value}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentLocationIds = Array.isArray(viewModel.editingProfile?.locationIds) 
                                ? viewModel.editingProfile.locationIds 
                                : [];
                              let newIds: string[];
                              if (checked) {
                                // Add location if not already selected
                                if (!currentLocationIds.includes(loc.value)) {
                                  newIds = [...currentLocationIds, loc.value];
                                } else {
                                  newIds = currentLocationIds;
                                }
                              } else {
                                // Remove location
                                newIds = currentLocationIds.filter(id => id !== loc.value);
                              }
                              viewModel.setEditingProfile({
                                ...viewModel.editingProfile!,
                                locationIds: newIds.length > 0 ? newIds : null
                              });
                            }}
                          />
                          <Label
                            htmlFor={`location-${loc.value}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {loc.label}
                          </Label>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedWorker.locationNames && selectedWorker.locationNames.length > 0 ? (
                    selectedWorker.locationNames.map((name: string, idx: number) => (
                      <Badge key={idx} variant="default" className="text-xs">
                        {name}
                      </Badge>
                    ))
                  ) : selectedWorker.locationName ? (
                    <Badge variant="default" className="text-xs">
                      {selectedWorker.locationName}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">No locations assigned</span>
                  )}
                </div>
              )}
            </div>

            {/* Teams */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Teams
              </Label>
              {viewModel.isEditMode ? (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-md p-3">
                  {viewModel.teamOptions.length > 0 ? (
                    viewModel.teamOptions.map(team => {
                      const isSelected = viewModel.editingTeamIds.includes(team.value) || 
                                        viewModel.editingTeamIds.includes(team.label);
                      return (
                        <div key={team.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`team-${team.value}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const currentTeamIds = [...viewModel.editingTeamIds];
                              let newTeamIds: string[];
                              
                              if (checked) {
                                // Add team if not already selected
                                if (!currentTeamIds.includes(team.value) && !currentTeamIds.includes(team.label)) {
                                  newTeamIds = [...currentTeamIds, team.value];
                                } else {
                                  newTeamIds = currentTeamIds;
                                }
                              } else {
                                // Remove team
                                newTeamIds = currentTeamIds.filter(
                                  id => id !== team.value && id !== team.label
                                );
                              }
                              viewModel.setEditingTeamIds(newTeamIds);
                            }}
                          />
                          <Label
                            htmlFor={`team-${team.value}`}
                            className="text-sm font-normal cursor-pointer flex-1"
                          >
                            {team.label}
                          </Label>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedLocationIds.length === 0 
                        ? "Select locations first to see available teams"
                        : "No teams available for selected locations"}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedWorker.teams && Array.isArray(selectedWorker.teams) && selectedWorker.teams.length > 0 ? (
                    selectedWorker.teams.map((team: any, idx: number) => (
                      <Badge
                        key={`${team.team_id}-${idx}`}
                        variant={team.is_active ? "default" : "outline"}
                        className={`text-xs ${!team.is_active ? 'opacity-60' : ''}`}
                      >
                        {team.team_name}
                      </Badge>
                    ))
                  ) : selectedWorker.teamName ? (
                    <Badge variant="default" className="text-xs">
                      {selectedWorker.teamName}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">No teams assigned</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Hours Summary Section */}
          <div className="space-y-4 pt-4 border-t border-sidebar-border">
            <h3 className="text-sm font-semibold text-foreground">Hours</h3>
            
            {/* Worked Hours */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Worked Hours
              </Label>
              {viewModel.isLoadingHoursSummary ? (
                <Skeleton className="h-20 w-full" />
              ) : viewModel.hoursSummary ? (
                <div className="space-y-2 p-3 border rounded-md bg-background">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Contract Hours:</span>
                    <span className="font-semibold">
                      {viewModel.hoursSummary.workedHours.totalContractHours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Hours Worked:</span>
                    <span className="font-semibold">
                      {viewModel.hoursSummary.workedHours.totalHoursWorked.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Difference:</span>
                    <span className={`font-bold ${
                      viewModel.hoursSummary.workedHours.difference >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {viewModel.hoursSummary.workedHours.difference >= 0 ? '+' : ''}
                      {viewModel.hoursSummary.workedHours.difference.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hours data available</p>
              )}
            </div>
            
            {/* Leave Hours */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Leave Hours
              </Label>
              {viewModel.isLoadingHoursSummary ? (
                <Skeleton className="h-20 w-full" />
              ) : viewModel.hoursSummary ? (
                <div className="space-y-2 p-3 border rounded-md bg-background">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Opgebouwd Verlof:</span>
                    <span className="font-semibold">
                      {viewModel.hoursSummary.leaveHours.totalOpgebouwdVerlof.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Opgenomen Verlof:</span>
                    <span className="font-semibold">
                      {viewModel.hoursSummary.leaveHours.totalOpgenomenVerlof.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Difference:</span>
                    <span className={`font-bold ${
                      viewModel.hoursSummary.leaveHours.difference >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {viewModel.hoursSummary.leaveHours.difference >= 0 ? '+' : ''}
                      {viewModel.hoursSummary.leaveHours.difference.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No leave data available</p>
              )}
            </div>
            
            {/* Total Hours Results */}
            {viewModel.hoursSummary && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-medium text-muted-foreground">
                  Total Hours Results
                </Label>
                <div className="p-3 border rounded-md bg-muted/50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Contract Hours</p>
                      <p className="font-semibold">
                        {viewModel.hoursSummary.totalResults.contractHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Worked Hours</p>
                      <p className="font-semibold">
                        {viewModel.hoursSummary.totalResults.workedHours.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Contract Diff</p>
                      <p className={`font-semibold ${
                        viewModel.hoursSummary.totalResults.contractDifference >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {viewModel.hoursSummary.totalResults.contractDifference >= 0 ? '+' : ''}
                        {viewModel.hoursSummary.totalResults.contractDifference.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Accrued Leave</p>
                      <p className="font-semibold">
                        {viewModel.hoursSummary.totalResults.accruedLeave.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Taken Leave</p>
                      <p className="font-semibold">
                        {viewModel.hoursSummary.totalResults.takenLeave.toFixed(1)}h
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Leave Diff</p>
                      <p className={`font-semibold ${
                        viewModel.hoursSummary.totalResults.leaveDifference >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {viewModel.hoursSummary.totalResults.leaveDifference >= 0 ? '+' : ''}
                        {viewModel.hoursSummary.totalResults.leaveDifference.toFixed(1)}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Performance Overview Section */}
          <div className="space-y-4 pt-4 border-t border-sidebar-border">
            <h3 className="text-sm font-semibold text-foreground">Performance Overview</h3>
            
            {/* Time Period Selectors - Hide if contract is inactive */}
            {isContractActive && (
              <div className="flex gap-2">
                <Button
                  variant={viewModel.performancePeriod === "total" ? "default" : "outline"}
                  size="sm"
                  onClick={() => viewModel.setPerformancePeriod("total")}
                  className="text-xs"
                >
                  Total
                </Button>
                <Button
                  variant={viewModel.performancePeriod === "thisMonth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => viewModel.setPerformancePeriod("thisMonth")}
                  className="text-xs"
                >
                  This Month
                </Button>
                <Button
                  variant={viewModel.performancePeriod === "lastMonth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => viewModel.setPerformancePeriod("lastMonth")}
                  className="text-xs"
                >
                  Last Month
                </Button>
              </div>
            )}
            
            
            {/* Hours Breakdown */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Hours Breakdown</Label>
              {viewModel.isLoadingHours ? (
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : viewModel.hoursBreakdown ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 border rounded-md bg-background">
                    <p className="text-xs text-muted-foreground mb-1">Gewerkt</p>
                    <p className="text-lg font-semibold">{viewModel.hoursBreakdown.gewerkt.toFixed(1)}h</p>
                  </div>
                  <div className="p-3 border rounded-md bg-background">
                    <p className="text-xs text-muted-foreground mb-1">Ziek</p>
                    <p className="text-lg font-semibold">{viewModel.hoursBreakdown.ziek.toFixed(1)}h</p>
                  </div>
                  <div className="p-3 border rounded-md bg-background">
                    <p className="text-xs text-muted-foreground mb-1">Verlof</p>
                    <p className="text-lg font-semibold">{viewModel.hoursBreakdown.verlof.toFixed(1)}h</p>
                  </div>
                  <div className="p-3 border rounded-md bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Total</p>
                    <p className="text-lg font-semibold">{viewModel.hoursBreakdown.total.toFixed(1)}h</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hours data available</p>
              )}
            </div>

            {/* Sales Generated */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Sales Generated</Label>
              {viewModel.isLoadingSales ? (
                <Skeleton className="h-24 w-full" />
              ) : viewModel.salesSummary ? (
                <div className="p-4 border rounded-md bg-muted/50">
                  <div className="flex items-baseline gap-2 mb-3">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">
                      {viewModel.salesSummary.totalRevenue.toLocaleString('nl-NL', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                      <p className="font-semibold">{viewModel.salesSummary.totalTransactions}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg. Ticket</p>
                      <p className="font-semibold">
                        {viewModel.salesSummary.averageTicketValue.toLocaleString('nl-NL', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sales data available</p>
              )}
            </div>
          </div>

          {/* Labor Costs Section */}
          <div className="space-y-4 pt-4 border-t border-sidebar-border">
            <h3 className="text-sm font-semibold text-foreground">Labor Costs</h3>
            
            {/* Time Period Selectors - Hide if contract is inactive */}
            {isContractActive && (
              <div className="flex gap-2">
                <Button
                  variant={viewModel.laborCostPeriod === "total" ? "default" : "outline"}
                  size="sm"
                  onClick={() => viewModel.setLaborCostPeriod("total")}
                  className="text-xs"
                >
                  Total
                </Button>
                <Button
                  variant={viewModel.laborCostPeriod === "thisMonth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => viewModel.setLaborCostPeriod("thisMonth")}
                  className="text-xs"
                >
                  This Month
                </Button>
                <Button
                  variant={viewModel.laborCostPeriod === "lastMonth" ? "default" : "outline"}
                  size="sm"
                  onClick={() => viewModel.setLaborCostPeriod("lastMonth")}
                  className="text-xs"
                >
                  Last Month
                </Button>
              </div>
            )}
            

            {/* Labor Cost Value */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Labor Cost Value</Label>
              {viewModel.isLoadingLaborCost ? (
                <Skeleton className="h-16 w-full" />
              ) : viewModel.laborCost !== null ? (
                <div className="p-4 border rounded-md bg-muted/50">
                  <div className="flex items-baseline gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <p className="text-2xl font-bold">
                      {viewModel.laborCost?.totalCost.toLocaleString('nl-NL', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No labor cost data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

