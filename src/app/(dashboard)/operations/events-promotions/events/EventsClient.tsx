/**
 * Events - Client Component
 * Full CRUD interface for event management with single and repeating events
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Calendar, Repeat, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getBreadcrumb } from "@/lib/navigation/breadcrumb-registry";
import { Event, RecurrencePattern, CustomRecurrencePattern } from "@/models/events/event.model";
import { getLocations } from "@/lib/services/graphql/queries";
import { AutoFilterRegistry } from "@/components/navigation/auto-filter-registry";
import { SmartMonthFilter } from "@/components/view-data/SmartMonthFilter";
import { LocationFilterButtons } from "@/components/view-data/LocationFilterButtons";

// Format date for input (YYYY-MM-DD)
function formatDateForInput(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Format date for display
function formatDateForDisplay(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function EventsClient() {
  const pathname = usePathname();
  const pageMetadata = getBreadcrumb(pathname);
  
  // State
  const [events, setEvents] = useState<Event[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    locationId: '',
    startDate: '',
    endDate: '',
    notes: '',
    isActive: true,
  });
  const [isRepeating, setIsRepeating] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern | 'custom'>('weekly');
  const [customPattern, setCustomPattern] = useState<CustomRecurrencePattern>({
    type: 'custom',
    daysOfWeek: [],
    interval: 1,
    unit: 'week',
    weekOfMonth: undefined,
    dayOfWeek: undefined,
  });
  
  // Filter state
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  
  // Load events
  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/events');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      } else {
        console.error('Failed to load events:', data.error);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      alert('Failed to load events. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load locations
  const loadLocations = async () => {
    try {
      const locs = await getLocations();
      setLocations(locs);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };
  
  useEffect(() => {
    loadEvents();
    loadLocations();
  }, []);
  
  // Handle create event
  const handleCreate = async () => {
    try {
      let recurrencePatternData: RecurrencePattern | CustomRecurrencePattern | undefined;
      
      if (isRepeating) {
        if (recurrencePattern === 'custom') {
          recurrencePatternData = customPattern;
        } else {
          recurrencePatternData = recurrencePattern;
        }
      }
      
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          locationId: formData.locationId || undefined,
          startDate: formData.startDate,
          endDate: isRepeating ? undefined : (formData.endDate || undefined),
          isRepeating,
          recurrencePattern: recurrencePatternData,
          notes: formData.notes,
          isActive: formData.isActive,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create event');
        return;
      }
      
      setIsCreateDialogOpen(false);
      setFormData({ title: '', locationId: '', startDate: '', endDate: '', notes: '', isActive: true });
      setIsRepeating(false);
      setRecurrencePattern('weekly');
      setCustomPattern({ type: 'custom', daysOfWeek: [], interval: 1, unit: 'week', weekOfMonth: undefined, dayOfWeek: undefined });
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };
  
  // Handle edit event
  const handleEdit = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      locationId: event.locationId || '',
      startDate: formatDateForInput(event.startDate),
      endDate: event.endDate ? formatDateForInput(event.endDate) : '',
      notes: event.notes || '',
      isActive: event.isActive,
    });
    setIsRepeating(event.isRepeating);
    
    if (event.isRepeating && event.recurrencePattern) {
      if (typeof event.recurrencePattern === 'object' && event.recurrencePattern.type === 'custom') {
        setRecurrencePattern('custom');
        setCustomPattern(event.recurrencePattern);
      } else {
        setRecurrencePattern(event.recurrencePattern as RecurrencePattern);
      }
    } else {
      setRecurrencePattern('weekly');
      setCustomPattern({ type: 'custom', daysOfWeek: [], interval: 1, unit: 'week' });
    }
    
    setIsEditDialogOpen(true);
  };
  
  // Handle update event
  const handleUpdate = async () => {
    if (!selectedEvent) return;
    
    try {
      let recurrencePatternData: RecurrencePattern | CustomRecurrencePattern | undefined;
      
      if (isRepeating) {
        if (recurrencePattern === 'custom') {
          recurrencePatternData = customPattern;
        } else {
          recurrencePatternData = recurrencePattern;
        }
      }
      
      const response = await fetch(`/api/events/${selectedEvent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          locationId: formData.locationId || undefined,
          startDate: formData.startDate,
          endDate: isRepeating ? undefined : (formData.endDate || undefined),
          isRepeating,
          recurrencePattern: recurrencePatternData,
          notes: formData.notes,
          isActive: formData.isActive,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update event');
        return;
      }
      
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
      setFormData({ title: '', locationId: '', startDate: '', endDate: '', notes: '', isActive: true });
      setIsRepeating(false);
      setRecurrencePattern('weekly');
      setCustomPattern({ type: 'custom', daysOfWeek: [], interval: 1, unit: 'week', weekOfMonth: undefined, dayOfWeek: undefined });
      loadEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      alert('Failed to update event');
    }
  };
  
  // Handle delete event
  const handleDelete = async (event: Event) => {
    if (!confirm(`Are you sure you want to delete event "${event.title}"?`)) return;
    
    try {
      const response = await fetch(`/api/events/${event._id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        alert('Failed to delete event');
        return;
      }
      
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };
  
  // Check if event is currently active
  const isActiveEvent = (event: Event): boolean => {
    if (!event.isActive) return false;
    const now = new Date();
    const start = new Date(event.startDate);
    if (event.isRepeating) {
      // For repeating events, check if current date matches pattern
      // Simplified: just check if start date has passed
      return start <= now;
    } else {
      const end = event.endDate ? new Date(event.endDate) : start;
      return start <= now && now <= end;
    }
  };
  
  // Calculate month counts for smart filter
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    events.forEach((event) => {
      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : startDate;
      const eventYear = startDate.getFullYear();
      
      // Only count if year matches selected year
      if (eventYear !== selectedYear) return;
      
      // Check location filter
      if (selectedLocation !== "all" && event.locationId !== selectedLocation) return;
      
      // For repeating events, count all months from start date to end of year (or endDate if set)
      if (event.isRepeating) {
        const repeatEnd = endDate || new Date(selectedYear, 11, 31);
        for (let month = 1; month <= 12; month++) {
          const monthStart = new Date(selectedYear, month - 1, 1);
          const monthEnd = new Date(selectedYear, month, 0, 23, 59, 59);
          
          if (startDate <= monthEnd && repeatEnd >= monthStart) {
            counts[month] = (counts[month] || 0) + 1;
          }
        }
      } else {
        // For single events, count months that overlap with event date range
        for (let month = 1; month <= 12; month++) {
          const monthStart = new Date(selectedYear, month - 1, 1);
          const monthEnd = new Date(selectedYear, month, 0, 23, 59, 59);
          
          if (startDate <= monthEnd && endDate >= monthStart) {
            counts[month] = (counts[month] || 0) + 1;
          }
        }
      }
    });
    return counts;
  }, [events, selectedYear, selectedLocation]);

  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : startDate;
      const eventYear = startDate.getFullYear();
      
      // Year filter
      if (eventYear !== selectedYear) return false;
      
      // Month filter
      if (selectedMonth !== null) {
        const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
        const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
        if (startDate > monthEnd || endDate < monthStart) return false;
      }
      
      // Location filter
      if (selectedLocation !== "all" && event.locationId !== selectedLocation) return false;
      
      return true;
    });
  }, [events, selectedYear, selectedMonth, selectedLocation]);

  // Filter location options - only show specific locations
  const filterLocationOptions = useMemo(() => {
    const targetNames = ["Van Kinsbergen", "Bar Bea", "L'Amour Toujours", "l'Amour Toujours", "l'Amour Toujours"];
    const filtered = locations.filter((loc) => 
      targetNames.some(name => loc.name === name || loc.name?.includes(name))
    );
    return [
      { value: "all", label: "All Locations" },
      ...filtered.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Auto-generate filter labels from state
  const filterLabels = useMemo(() => [
    { key: "year", label: "Year", value: selectedYear },
    { key: "month", label: "Month", value: selectedMonth },
    { key: "location", label: "Location", value: selectedLocation !== "all" ? selectedLocation : null },
  ], [selectedYear, selectedMonth, selectedLocation]);

  // Filter change handlers - memoized with useCallback for stable reference
  const handleFilterChange = useCallback((key: string, value: any) => {
    switch (key) {
      case "year": setSelectedYear(value); break;
      case "month": setSelectedMonth(value); break;
      case "location": setSelectedLocation(value); break;
    }
  }, []);

  // Filter remove handlers - memoized with useCallback for stable reference
  const handleFilterRemove = useCallback((key: string) => {
    switch (key) {
      case "year": setSelectedYear(currentYear); break;
      case "month": setSelectedMonth(null); break;
      case "location": setSelectedLocation("all"); break;
    }
  }, [currentYear]);

  // Format recurrence pattern for display
  const formatRecurrencePattern = (event: Event): string => {
    if (!event.isRepeating || !event.recurrencePattern) return 'Single event';
    
    if (typeof event.recurrencePattern === 'object' && event.recurrencePattern.type === 'custom') {
      const pattern = event.recurrencePattern;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekNames = ['First', 'Second', 'Third', 'Fourth', 'Last'];
      
      // Check if it's a monthly pattern with week of month
      if (pattern.weekOfMonth !== undefined && pattern.dayOfWeek !== undefined) {
        const weekName = pattern.weekOfMonth === -1 ? 'Last' : weekNames[pattern.weekOfMonth - 1];
        const dayName = days[pattern.dayOfWeek];
        return `${weekName} ${dayName} of every month`;
      }
      
      // Regular custom pattern with days of week
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        const dayNames = pattern.daysOfWeek.map(d => days[d]).join(', ');
        const interval = pattern.interval || 1;
        const unit = pattern.unit || 'week';
        return `Every ${interval} ${unit}(s) on ${dayNames}`;
      }
      return 'Custom pattern';
    }
    
    const pattern = event.recurrencePattern as RecurrencePattern;
    switch (pattern) {
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      default:
        return 'Repeating';
    }
  };
  
  // Toggle day of week for custom pattern
  const toggleDayOfWeek = (day: number) => {
    const days = customPattern.daysOfWeek || [];
    if (days.includes(day)) {
      setCustomPattern({ ...customPattern, daysOfWeek: days.filter(d => d !== day) });
    } else {
      setCustomPattern({ ...customPattern, daysOfWeek: [...days, day].sort() });
    }
  };
  
  // Render recurrence pattern options
  const renderRecurrenceOptions = () => {
    if (!isRepeating) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <Label>Recurrence Pattern</Label>
          <Select value={recurrencePattern} onValueChange={(val) => {
            setRecurrencePattern(val as RecurrencePattern | 'custom');
            // Reset custom pattern when changing pattern type
            if (val !== 'custom') {
              setCustomPattern({ type: 'custom', daysOfWeek: [], interval: 1, unit: 'week', weekOfMonth: undefined, dayOfWeek: undefined });
            }
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly (same day each week)</SelectItem>
              <SelectItem value="monthly">Monthly (same date each month)</SelectItem>
              <SelectItem value="custom">Custom Pattern</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {recurrencePattern === 'monthly' && (
          <div className="space-y-4 border p-4 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Week of Month</Label>
                <Select
                  value={customPattern.weekOfMonth?.toString() || ''}
                  onValueChange={(val) => setCustomPattern({ ...customPattern, weekOfMonth: val === 'last' ? -1 : parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">First week</SelectItem>
                    <SelectItem value="2">Second week</SelectItem>
                    <SelectItem value="3">Third week</SelectItem>
                    <SelectItem value="4">Fourth week</SelectItem>
                    <SelectItem value="last">Last week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Day of Week</Label>
                <Select
                  value={customPattern.dayOfWeek?.toString() || ''}
                  onValueChange={(val) => setCustomPattern({ ...customPattern, dayOfWeek: parseInt(val) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        
        {recurrencePattern === 'custom' && (
          <div className="space-y-4 border p-4 rounded-md">
            <div>
              <Label>Days of Week</Label>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div key={index} className="flex flex-col items-center gap-1">
                    <Checkbox
                      checked={customPattern.daysOfWeek?.includes(index) || false}
                      onCheckedChange={() => toggleDayOfWeek(index)}
                    />
                    <Label className="text-xs">{day}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Interval</Label>
                <Input
                  type="number"
                  min="1"
                  value={customPattern.interval || 1}
                  onChange={(e) => setCustomPattern({ ...customPattern, interval: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={customPattern.unit || 'week'}
                  onValueChange={(val) => setCustomPattern({ ...customPattern, unit: val as 'week' | 'month' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week(s)</SelectItem>
                    <SelectItem value="month">Month(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
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
      
      {/* Create Button */}
      <div className="flex justify-end">
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Event Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Happy Hour, Live Music Night"
                />
              </div>
              
              <div>
                <Label>Location</Label>
                <Select value={formData.locationId || "none"} onValueChange={(val) => setFormData({ ...formData, locationId: val === "none" ? "" : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isRepeating}
                  onCheckedChange={setIsRepeating}
                />
                <Label>Repeating Event</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                {!isRepeating && (
                  <div>
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                )}
              </div>
              
              {renderRecurrenceOptions()}
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this event..."
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Auto-registered Filters - Will show in Sheet/Drawer, hidden in page */}
      <AutoFilterRegistry
        filters={{
          labels: filterLabels,
          onFilterChange: handleFilterChange,
          onFilterRemove: handleFilterRemove,
        }}
      >
        <div className="space-y-4">
          {/* Year Filter */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-foreground">Year</span>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className={`border rounded-sm ${
                  selectedYear === currentYear
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-black hover:bg-blue-500 hover:border-blue-500 hover:text-white"
                }`}
                onClick={() => setSelectedYear(currentYear)}
              >
                {currentYear}
              </Button>
            </div>
          </div>

          {/* Smart Month Filter */}
          <SmartMonthFilter
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            monthCounts={monthCounts}
          />

          {/* Location Filter */}
          <LocationFilterButtons
            options={filterLocationOptions}
            selectedValue={selectedLocation}
            onValueChange={setSelectedLocation}
            label="Location"
          />
        </div>
      </AutoFilterRegistry>
      
      {/* Events List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading events...
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No events created yet. Click "Create New Event" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event) => (
            <Card key={event._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>
                        {event.title}
                        {event.locationId && (
                          <span className="text-muted-foreground"> / {locations.find(l => l.id === event.locationId)?.name || event.locationId}</span>
                        )}
                      </CardTitle>
                      {isActiveEvent(event) && (
                        <Badge variant="default" className="bg-green-600">Active</Badge>
                      )}
                      {!event.isActive && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {event.isRepeating && (
                        <Badge variant="outline">
                          <Repeat className="h-3 w-3 mr-1" />
                          {formatRecurrencePattern(event)}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDateForDisplay(event.startDate)}
                      {event.endDate && !event.isRepeating && (
                        <>
                          {' '}- {formatDateForDisplay(event.endDate)}
                          <span className="text-muted-foreground">
                            ({Math.ceil((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / (1000 * 60 * 60 * 24))} days)
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(event)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {event.notes && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{event.notes}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Happy Hour, Live Music Night"
              />
            </div>
            
            <div>
              <Label>Location</Label>
              <Select value={formData.locationId || "none"} onValueChange={(val) => setFormData({ ...formData, locationId: val === "none" ? "" : val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={isRepeating}
                onCheckedChange={setIsRepeating}
              />
              <Label>Repeating Event</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              {!isRepeating && (
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              )}
            </div>
            
            {renderRecurrenceOptions()}
            
            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this event..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Update Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

