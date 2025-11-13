/**
 * Workers V2 View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, X, ArrowUpDown } from "lucide-react";
import { formatDateDDMMYY } from "@/lib/dateFormatters";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";
import { SimplePagination } from "@/components/view-data/SimplePagination";
import { LoadingState } from "@/components/view-data/LoadingState";
import { ErrorState } from "@/components/view-data/ErrorState";
import { useWorkersV2ViewModel } from "@/viewmodels/eitje-v2/useWorkersV2ViewModel";
import { EditingProfile } from "@/models/eitje-v2/workers-v2.model";
import { memo, useId } from "react";
import type React from "react";

// Memoized table rows component to prevent full table rerenders
const TableRows = memo(({
  records,
  editingId,
  editingProfile,
  setEditingProfile,
  handleSave,
  handleCancel,
  handleEdit,
  handleDelete,
  updateMutation,
  locations
}: {
  records: EditingProfile[];
  editingId: number | null;
  editingProfile: EditingProfile | null;
  setEditingProfile: (profile: EditingProfile | null) => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleEdit: (profile: EditingProfile) => void;
  handleDelete: (id: number) => void;
  updateMutation: { isPending: boolean };
  locations: Array<{ id: string; name: string }>;
}) => {
  return (
    <>
      {records.map((profile: EditingProfile) => {
        const isEditing = editingId === profile.id;
        const locationName = profile.location_name || locations.find((loc: { id: string; name: string }) => loc.id === profile.location_id)?.name || profile.location_id || "-";

        return (
          <TableRow key={`profile-${profile.id}-${profile.eitje_user_id}`}>
            <TableCell>
              <div className="font-medium">{profile.user_name || `User ${profile.eitje_user_id}`}</div>
              <div className="text-xs text-muted-foreground">ID: {profile.eitje_user_id}</div>
            </TableCell>
            <TableCell>{locationName}</TableCell>
            {isEditing ? (
              <>
                <TableCell className="text-muted-foreground">{profile.team_name || "-"}</TableCell>
                <TableCell>
                  <Select
                    value={editingProfile?.contract_type || ""}
                    onValueChange={(value) => setEditingProfile({
                      ...editingProfile!,
                      contract_type: value || undefined
                    })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.1"
                    className="w-[120px]"
                    value={editingProfile?.contract_hours || ""}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile!,
                      contract_hours: parseFloat(e.target.value) || undefined
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    className="w-[120px]"
                    value={editingProfile?.hourly_wage || ""}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile!,
                      hourly_wage: parseFloat(e.target.value) || undefined
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={editingProfile?.wage_override || false}
                    onCheckedChange={(checked) => setEditingProfile({
                      ...editingProfile!,
                      wage_override: checked === true
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={editingProfile?.effective_from || ""}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile!,
                      effective_from: e.target.value || undefined
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    className="w-[150px]"
                    value={editingProfile?.effective_to || ""}
                    onChange={(e) => setEditingProfile({
                      ...editingProfile!,
                      effective_to: e.target.value || undefined
                    })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </>
            ) : (
              <>
                <TableCell>{profile.team_name || "-"}</TableCell>
                <TableCell>{profile.contract_type || "-"}</TableCell>
                <TableCell>{profile.contract_hours ? profile.contract_hours.toFixed(1) : "-"}</TableCell>
                <TableCell>{profile.hourly_wage ? `€${profile.hourly_wage.toFixed(2)}` : "-"}</TableCell>
                <TableCell>{profile.wage_override ? "Yes" : "No"}</TableCell>
                <TableCell>{profile.effective_from ? formatDateDDMMYY(profile.effective_from) : "-"}</TableCell>
                <TableCell>{profile.effective_to ? formatDateDDMMYY(profile.effective_to) : "Active"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(profile)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(profile.id!)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </>
            )}
          </TableRow>
        );
      })}
    </>
  );
});

TableRows.displayName = "TableRows";

// Memoized table header to prevent rerenders - only rerenders if onNameSort reference changes
const TableHeaderMemo = memo(({ onNameSort }: { onNameSort: () => void }) => {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="font-semibold bg-white">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 -ml-2 hover:bg-transparent"
            onClick={onNameSort}
          >
            User
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </TableHead>
        <TableHead className="font-semibold bg-white">Location</TableHead>
        <TableHead className="font-semibold bg-white">Team</TableHead>
        <TableHead className="font-semibold bg-white">Contract Type</TableHead>
        <TableHead className="font-semibold bg-white">Contract Hours</TableHead>
        <TableHead className="font-semibold bg-white">Hourly Wage</TableHead>
        <TableHead className="font-semibold bg-white">Wage Override</TableHead>
        <TableHead className="font-semibold bg-white">Start Contract</TableHead>
        <TableHead className="font-semibold bg-white">End Contract</TableHead>
        <TableHead className="font-semibold bg-white">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}, (prevProps, nextProps) => {
  // Only rerender if onNameSort function reference changes
  return prevProps.onNameSort === nextProps.onNameSort;
});

TableHeaderMemo.displayName = "TableHeaderMemo";

// Static table header - never rerenders, uses inline styles for sticky positioning
const StaticTableHeader = memo(({ onNameSort, uniqueId }: { onNameSort: () => void; uniqueId: string }) => {
  return (
    <>
      <style>{`
        #${uniqueId} thead {
          position: sticky;
          top: 0;
          z-index: 20;
          background-color: white;
        }
        #${uniqueId} thead th {
          background-color: white;
        }
        #${uniqueId} tbody tr td:first-child,
        #${uniqueId} thead tr th:first-child {
          position: sticky;
          left: 0;
          z-index: 10;
          background-color: white;
          border-right: 2px solid #e5e7eb;
        }
        #${uniqueId} thead tr th:first-child {
          z-index: 30;
        }
      `}</style>
      <TableHeaderMemo onNameSort={onNameSort} />
    </>
  );
}, (prevProps, nextProps) => {
  // Only rerender if onNameSort function reference changes
  return prevProps.onNameSort === nextProps.onNameSort && prevProps.uniqueId === nextProps.uniqueId;
});

StaticTableHeader.displayName = "StaticTableHeader";

export default function WorkersV2Page() {
  const viewModel = useWorkersV2ViewModel();
  const tableId = useId();

  return (
    <div className="space-y-6">
      {/* Year and Month Filters */}
      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-sm font-bold text-foreground">Year</span>
          <div className="flex items-center gap-2 flex-wrap">
            {viewModel.years.map((year) => {
              const isActive = viewModel.selectedYear === year;
              return (
                <Button
                  key={year}
                  variant="outline"
                  size="sm"
                  className={`border rounded-sm ${
                    isActive
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                  }`}
                  onClick={() => {
                    viewModel.setSelectedYear(year);
                    if (viewModel.selectedMonth) viewModel.setSelectedMonth(null);
                    if (viewModel.selectedDay) viewModel.setSelectedDay(null);
                  }}
                >
                  {year}
                </Button>
              );
            })}
            <Select value={viewModel.yearMonthValue} onValueChange={viewModel.handleYearMonthChange}>
              <SelectTrigger
                className={`min-w-[140px] w-auto border rounded-sm ${
                  viewModel.selectedMonth !== null
                    ? "bg-blue-500 border-blue-500 text-white [&>svg]:text-white [&>span]:text-white"
                    : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                }`}
              >
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={`${viewModel.selectedYear}-all`}>Month</SelectItem>
                {viewModel.months.map((month) => (
                  <SelectItem key={month.value} value={`${viewModel.selectedYear}-${String(month.value).padStart(2, "0")}`}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={viewModel.selectedDay !== null ? String(viewModel.selectedDay) : "all"}
              onValueChange={viewModel.handleDayChange}
              disabled={viewModel.selectedMonth === null}
            >
              <SelectTrigger
                className={`min-w-[100px] w-auto border rounded-sm ${
                  viewModel.selectedMonth === null
                    ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                    : viewModel.selectedDay !== null
                    ? "bg-blue-500 border-blue-500 text-white [&>svg]:text-white [&>span]:text-white"
                    : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                }`}
              >
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Day</SelectItem>
                {viewModel.availableDays.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {String(day).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Location Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <LocationFilterButtons
            options={viewModel.locationOptions}
            selectedValue={viewModel.selectedLocation}
            onValueChange={viewModel.setSelectedLocation}
          />
        </div>
      </div>

      {/* Active/Inactive Filter */}
      <div className="space-y-2">
        <span className="text-sm font-bold text-foreground">Status</span>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className={`border rounded-sm ${
              viewModel.activeFilter === "all"
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
            }`}
            onClick={() => viewModel.setActiveFilter("all")}
          >
            All
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`border rounded-sm ${
              viewModel.activeFilter === "active"
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
            }`}
            onClick={() => viewModel.setActiveFilter("active")}
          >
            Active
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`border rounded-sm ${
              viewModel.activeFilter === "inactive"
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
            }`}
            onClick={() => viewModel.setActiveFilter("inactive")}
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {viewModel.isLoading && <LoadingState />}

      {/* Error state */}
      {viewModel.error && (
        <ErrorState error={viewModel.error} message="Error loading worker profiles" />
      )}

      {/* Create new profile form */}
      {!viewModel.isLoading && !viewModel.error && viewModel.isCreating && viewModel.editingProfile && (
        <div className="bg-white rounded-sm border border-black px-4 py-4 space-y-4">
          <h2 className="text-lg font-semibold mb-4">Create New Worker Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Eitje User ID *</Label>
              <Input
                type="number"
                value={viewModel.editingProfile.eitje_user_id || ""}
                onChange={(e) => viewModel.setEditingProfile({
                  ...viewModel.editingProfile!,
                  eitje_user_id: parseInt(e.target.value, 10) || 0
                })}
              />
            </div>
            <div>
              <Label>Location</Label>
              <Input
                type="text"
                value={viewModel.editingProfile.location_id || ""}
                onChange={(e) => viewModel.setEditingProfile({
                  ...viewModel.editingProfile!,
                  location_id: e.target.value || undefined
                })}
                placeholder="Enter location ID (UUID)"
              />
            </div>
            <div>
              <Label>Contract Type</Label>
              <Select
                value={viewModel.editingProfile.contract_type || ""}
                onValueChange={(value) => viewModel.setEditingProfile({
                  ...viewModel.editingProfile!,
                  contract_type: value || undefined
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contract Hours (weekly)</Label>
              <Input
                type="number"
                step="0.1"
                value={viewModel.editingProfile.contract_hours || ""}
                onChange={(e) => viewModel.setEditingProfile({
                  ...viewModel.editingProfile!,
                  contract_hours: parseFloat(e.target.value) || undefined
                })}
              />
            </div>
            <div>
              <Label>Hourly Wage</Label>
              <Input
                type="number"
                step="0.01"
                value={viewModel.editingProfile.hourly_wage || ""}
                onChange={(e) => viewModel.setEditingProfile({
                  ...viewModel.editingProfile!,
                  hourly_wage: parseFloat(e.target.value) || undefined
                })}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="wage-override"
                checked={viewModel.editingProfile.wage_override}
                onCheckedChange={(checked) => viewModel.setEditingProfile({
                  ...viewModel.editingProfile!,
                  wage_override: checked === true
                })}
              />
              <Label htmlFor="wage-override" className="cursor-pointer">
                Wage Override (use hourly_wage instead of calculated)
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={viewModel.handleSave} disabled={viewModel.updateMutation.isPending || viewModel.createMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button variant="outline" onClick={viewModel.handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {!viewModel.isLoading && !viewModel.error && viewModel.data && (
        <>
          <div className="bg-white rounded-sm border border-black px-4" id={tableId}>
            <div className="overflow-auto max-h-[calc(100vh-300px)]">
              <table className="w-full caption-bottom text-sm border-collapse">
                <StaticTableHeader onNameSort={viewModel.handleNameSort} uniqueId={tableId} />
                <TableBody>
                  {viewModel.sortedRecords.length === 0 ? (
                    <TableRow key="no-data">
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        No worker profiles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRows
                      records={viewModel.sortedRecords}
                      editingId={viewModel.editingId}
                      editingProfile={viewModel.editingProfile}
                      setEditingProfile={viewModel.setEditingProfile}
                      handleSave={viewModel.handleSave}
                      handleCancel={viewModel.handleCancel}
                      handleEdit={viewModel.handleEdit}
                      handleDelete={viewModel.handleDelete}
                      updateMutation={viewModel.updateMutation}
                      locations={viewModel.locations}
                    />
                  )}
                </TableBody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <SimplePagination
            currentPage={viewModel.currentPage}
            totalPages={viewModel.totalPages}
            totalRecords={viewModel.data?.total || 0}
            onPageChange={viewModel.setCurrentPage}
            isLoading={viewModel.isLoading}
          />
        </>
      )}
    </div>
  );
}
