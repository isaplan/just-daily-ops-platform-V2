"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LayoutSwitchBarProps {
  layoutVersion: "v1" | "v2";
  onVersionChange: (version: "v1" | "v2") => void;
}

export function LayoutSwitchBar({ layoutVersion, onVersionChange }: LayoutSwitchBarProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-sm border-2 border-black rounded-lg px-3 py-2 shadow-sm">
      <Label htmlFor="layout-switch-bar" className="text-xs text-muted-foreground font-medium">
        V1
      </Label>
      <Switch
        id="layout-switch-bar"
        checked={layoutVersion === "v2"}
        onCheckedChange={(checked) => onVersionChange(checked ? "v2" : "v1")}
      />
      <Label htmlFor="layout-switch-bar" className="text-xs text-muted-foreground font-medium">
        V2
      </Label>
    </div>
  );
}



