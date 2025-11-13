"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ShowMoreColumnsToggleProps {
  isExpanded: boolean;
  onToggle: (expanded: boolean) => void;
  coreColumnCount: number;
  totalColumnCount: number;
}

export function ShowMoreColumnsToggle({
  isExpanded,
  onToggle,
  coreColumnCount,
  totalColumnCount,
}: ShowMoreColumnsToggleProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onToggle(!isExpanded)}
      className="mb-4"
    >
      {isExpanded ? (
        <>
          <ChevronUp className="h-4 w-4 mr-2" />
          Show Less ({coreColumnCount} columns)
        </>
      ) : (
        <>
          <ChevronDown className="h-4 w-4 mr-2" />
          Show More ({totalColumnCount} columns)
        </>
      )}
    </Button>
  );
}







