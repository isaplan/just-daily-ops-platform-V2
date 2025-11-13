import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PeriodType, formatPeriodLabel, getPeriodRange } from "@/lib/dateUtils";
import { SourceType } from "@/pages/departments/FinanceDataViewer";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface DataFiltersProps {
  selectedLocations: string[];
  onLocationChange: (locations: string[]) => void;
  sourceType: SourceType;
  onSourceTypeChange: (type: SourceType) => void;
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DataFilters({
  selectedLocations,
  onLocationChange,
  sourceType,
  onSourceTypeChange,
  periodType,
  onPeriodTypeChange,
  currentDate,
  onDateChange,
  searchQuery,
  onSearchChange,
}: DataFiltersProps) {
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      const { data } = await supabase.from("locations").select("id, name").order("name");
      setLocations(data || []);
    };
    fetchLocations();
  }, []);

  const navigatePeriod = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    
    if (periodType === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (periodType === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (periodType === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (periodType === "quarter") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 3 : -3));
    } else if (periodType === "year") {
      newDate.setFullYear(newDate.getFullYear() + (direction === "next" ? 1 : -1));
    }
    
    onDateChange(newDate);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Location Filter */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Select
              value={selectedLocations[0] || "all"}
              onValueChange={(value) => onLocationChange(value === "all" ? [] : [value])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Type Filter */}
          <div className="space-y-2">
            <Label>Data Source</Label>
            <Select value={sourceType} onValueChange={(value) => onSourceTypeChange(value as SourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="sales">Sales Data</SelectItem>
                <SelectItem value="labor">Labor Hours</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="pnl">P&L Data (Raw)</SelectItem>
                <SelectItem value="warehouse_summary">📊 Finance Warehouse (Summary)</SelectItem>
                <SelectItem value="warehouse_facts">📊 Finance Warehouse (Facts)</SelectItem>
                <SelectItem value="warehouse_kpis">📊 Finance Warehouse (KPIs)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Period Type Filter */}
          <div className="space-y-2">
            <Label>Period Type</Label>
            <Select value={periodType} onValueChange={(value) => onPeriodTypeChange(value as PeriodType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* Period Navigator */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigatePeriod("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-muted rounded-md min-w-[200px] text-center">
              <span className="font-medium">{formatPeriodLabel(periodType, currentDate)}</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigatePeriod("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={() => onDateChange(new Date())}>
            Today
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
