"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
}

interface LocationMultiSelectProps {
  locations: Location[];
  activeLocations: string[];
  onChange: (locationIds: string[]) => void;
}

export default function LocationMultiSelect({ 
  locations, 
  activeLocations, 
  onChange 
}: LocationMultiSelectProps) {
  // Filter out "All HNHG Locations" - legacy import indicator that shouldn't display
  // User will replace with API in the future
  const filteredLocations = locations.filter(
    loc => loc.id !== '93cd36b7-790c-4d29-9344-631188af32e4'
  );
  const toggleLocation = (locationId: string) => {
    if (locationId === "all") {
      // "All" is mutually exclusive with individual selections
      onChange(["all"]);
    } else {
      // Remove "all" if present, toggle individual location
      const filtered = activeLocations.filter(id => id !== "all");
      
      if (filtered.includes(locationId)) {
        const newSelection = filtered.filter(id => id !== locationId);
        // If nothing selected, default back to "all"
        onChange(newSelection.length > 0 ? newSelection : ["all"]);
      } else {
        onChange([...filtered, locationId]);
      }
    }
  };

  const isActive = (locationId: string) => activeLocations.includes(locationId);

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant={isActive("all") ? "default" : "outline"}
        size="sm"
        onClick={() => toggleLocation("all")}
      >
        <X className={cn(
          "mr-2 h-4 w-4 transition-opacity",
          isActive("all") ? "opacity-100" : "opacity-0"
        )} />
        All Locations
      </Button>
      
      {filteredLocations.map(location => (
        <Button
          key={location.id}
          variant={isActive(location.id) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleLocation(location.id)}
        >
          <X className={cn(
            "mr-2 h-4 w-4 transition-opacity",
            isActive(location.id) ? "opacity-100" : "opacity-0"
          )} />
          {location.name}
        </Button>
      ))}
    </div>
  );
}