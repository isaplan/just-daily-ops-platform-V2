/**
 * Worker Profile Sheet Component
 * Displays comprehensive worker information in a side sheet with edit capability
 */

"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkerProfileViewModel } from "@/viewmodels/workforce/useWorkerProfileViewModel";
import { useWorkerProfileSheet } from "@/contexts/WorkerProfileSheetContext";
import { Edit, Save, X, User, Clock, TrendingUp, Euro } from "lucide-react";

export function WorkerProfileSheet() {
  const { selectedWorker, isSheetOpen, closeWorkerSheet } = useWorkerProfileSheet();
  const viewModel = useWorkerProfileViewModel(selectedWorker);

  if (!selectedWorker) return null;

  // Calculate age if we have a date of birth (not available in current schema, skip for now)
  const age = null;

  return (
    <Sheet open={isSheetOpen} onOpenChange={(open) => !open && closeWorkerSheet()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {selectedWorker.userName || `User ${selectedWorker.eitjeUserId}`}
          </SheetTitle>
          <SheetDescription>
            Worker profile and performance overview
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Profile</CardTitle>
              {!viewModel.isEditMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={viewModel.handleEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={viewModel.handleCancel}
                    disabled={viewModel.updateMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={viewModel.handleSave}
                    disabled={viewModel.updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
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

              {/* Age (if available) */}
              {age !== null && (
                <div className="space-y-2">
                  <Label>Age</Label>
                  <p className="text-sm">{age} years</p>
                </div>
              )}

              {/* Contract Type */}
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract</Label>
                {viewModel.isEditMode ? (
                  <select
                    id="contractType"
                    value={viewModel.editingProfile?.contractType || ""}
                    onChange={(e) => viewModel.setEditingProfile({
                      ...viewModel.editingProfile!,
                      contractType: e.target.value || null
                    })}
                    className="w-full border rounded-md px-3 py-2 bg-background"
                  >
                    <option value="">Select Type</option>
                    <option value="Flexible">Flex</option>
                    <option value="zzp">ZZP</option>
                    <option value="nul uren">Nul Uren</option>
                  </select>
                ) : (
                  <p className="text-sm">
                    {selectedWorker.contractType 
                      ? selectedWorker.contractType.toLowerCase() === "flexible" 
                        ? "Flex" 
                        : selectedWorker.contractType 
                      : "-"}
                  </p>
                )}
              </div>

              {/* Hourly Wage */}
              <div className="space-y-2">
                <Label htmlFor="hourlyWage">Hourly Wage</Label>
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
                  />
                ) : (
                  <p className="text-sm">{selectedWorker.hourlyWage ? `€${selectedWorker.hourlyWage.toFixed(2)}` : "-"}</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                {viewModel.isEditMode ? (
                  <select
                    id="location"
                    multiple
                    value={viewModel.editingProfile?.locationIds || []}
                    onChange={(e) => {
                      const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                      viewModel.setEditingProfile({
                        ...viewModel.editingProfile!,
                        locationIds: selectedValues.length > 0 ? selectedValues : null
                      });
                    }}
                    className="w-full border rounded-md px-3 py-2 bg-background min-h-[100px]"
                    size={Math.min(viewModel.locationOptions.filter(loc => loc.value !== "all").length, 6)}
                  >
                    {viewModel.locationOptions
                      .filter(loc => loc.value !== "all")
                      .map(loc => (
                        <option key={loc.value} value={loc.value}>
                          {loc.label}
                        </option>
                      ))}
                  </select>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {selectedWorker.locationNames && selectedWorker.locationNames.length > 0 ? (
                      selectedWorker.locationNames.map((name: string, idx: number) => (
                        <Badge key={idx} variant="default" className="text-xs">{name}</Badge>
                      ))
                    ) : selectedWorker.locationName ? (
                      <Badge variant="default" className="text-xs">{selectedWorker.locationName}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                )}
              </div>

              {/* Team */}
              <div className="space-y-2">
                <Label>Team</Label>
                {viewModel.isEditMode ? (
                  <p className="text-sm text-muted-foreground">Team editing not available in sheet</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
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
                      <Badge variant="default" className="text-xs">{selectedWorker.teamName}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Overview Section */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Current month statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hours Breakdown */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours
                </h3>
                {viewModel.isLoadingHours ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : viewModel.hoursBreakdown ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Gewerkt</p>
                      <p className="text-2xl font-bold">{viewModel.hoursBreakdown.gewerkt.toFixed(1)}h</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Ziek</p>
                      <p className="text-2xl font-bold">{viewModel.hoursBreakdown.ziek.toFixed(1)}h</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground">Verlof</p>
                      <p className="text-2xl font-bold">{viewModel.hoursBreakdown.verlof.toFixed(1)}h</p>
                    </div>
                    <div className="p-3 border rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{viewModel.hoursBreakdown.total.toFixed(1)}h</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hours data available</p>
                )}
              </div>

              <Separator />

              {/* Sales Generated */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sales Generated
                </h3>
                {viewModel.isLoadingSales ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : viewModel.salesSummary ? (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-baseline gap-2">
                      <Euro className="h-5 w-5 text-muted-foreground" />
                      <p className="text-3xl font-bold">
                        {viewModel.salesSummary.totalRevenue.toLocaleString('nl-NL', {
                          style: 'currency',
                          currency: 'EUR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Transactions</p>
                        <p className="font-semibold">{viewModel.salesSummary.totalTransactions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg. Ticket</p>
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
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

