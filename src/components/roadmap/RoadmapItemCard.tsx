"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, GripVertical, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RoadmapItemCardProps {
  item: {
    id: string;
    title: string;
    description: string | null;
    department: string;
    category: string | null;
    is_active: boolean;
    triggers: string[];
    have_state?: string | null;
    branch_name?: string | null;
  };
  status: string;
  onEdit: () => void;
  canManage: boolean;
  listeners?: {
    onPointerDown?: (event: React.PointerEvent) => void;
    onKeyDown?: (event: React.KeyboardEvent) => void;
  };
  onStatusChange?: () => void;
  onHaveStateChange?: () => void;
}

const haveStateColors = {
  Must: "destructive",
  Should: "default",
  Could: "secondary",
  Want: "outline",
} as const;

export function RoadmapItemCard({ item, status, onEdit, canManage, listeners, onStatusChange, onHaveStateChange }: RoadmapItemCardProps) {
  const handleStatusChange = async (newStatus: string) => {
    const updateData: { status: string; is_active: boolean } = { 
      status: newStatus, 
      is_active: newStatus === "doing"
    };
    
    const { error } = await supabase
      .from("roadmap_items")
      .update(updateData)
      .eq("id", item.id);

    if (error) {
      console.error("Status update error:", error);
      toast.error("Failed to update status: " + error.message);
      return;
    }

    toast.success(`Status updated to ${formatStatus(newStatus)}`);
    
    // Trigger automation when status changes to "doing"
    // COMMENTED OUT: Branch creation automation disabled
    // if (newStatus === "doing") {
    //   try {
    //     const response = await fetch('/api/roadmap/automate', {
    //       method: 'POST',
    //       headers: {
    //         'Content-Type': 'application/json',
    //       },
    //       body: JSON.stringify({ roadmapItemId: item.id }),
    //     });

    //     const result = await response.json();

    //     if (response.ok) {
    //       if (result.branchName) {
    //         toast.success(
    //           `Branch "${result.branchName}" created and chat context ready!`,
    //           { duration: 5000 }
    //         );
    //       } else {
    //         toast.success('Chat context file generated!', { duration: 5000 });
    //       }
    //       console.log('Roadmap automation:', result);
    //       // Refresh to show branch name
    //       onStatusChange?.();
    //     } else {
    //       toast.error(`Automation failed: ${result.error}`);
    //     }
    //   } catch (error) {
    //     console.error('Failed to trigger roadmap automation:', error);
    //     toast.error('Failed to create branch (roadmap item updated)', { duration: 3000 });
    //   }
    // }

    // Trigger refresh to move item to correct swimlane
    onStatusChange?.();
  };

  const handleHaveStateChange = async (newHaveState: string) => {
    const { error } = await supabase
      .from("roadmap_items")
      .update({ have_state: newHaveState })
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to update have state: " + error.message);
    } else {
      toast.success(`Have state updated to ${newHaveState}`);
      // Trigger refresh to move item to correct swimlane
      onHaveStateChange?.();
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this roadmap item?")) return;

    const { error } = await supabase
      .from("roadmap_items")
      .delete()
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Roadmap item deleted");
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "doing":
        return "default";
      case "next-up":
        return "secondary";
      case "inbox":
        return "outline";
      case "done":
        return "outline";
      default:
        return "outline";
    }
  };

  const statusVariant = getStatusVariant(status);

  const haveStateVariant = item.have_state
    ? (haveStateColors[item.have_state as keyof typeof haveStateColors] || "outline")
    : "outline";

  const formatStatus = (status: string): string => {
    switch (status) {
      case "doing":
        return "Doing";
      case "next-up":
        return "Next Up";
      case "someday":
        return "Someday";
      case "inbox":
        return "Inbox";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <GripVertical className="h-5 w-5 text-muted-foreground mt-1 cursor-grab" {...listeners} />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <div className="flex gap-2">
                <Badge variant={statusVariant}>
                  {formatStatus(status)}
                </Badge>
                {item.have_state && (
                  <Badge variant={haveStateVariant}>{item.have_state}</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{item.department}</Badge>
              {item.category && <Badge variant="outline">{item.category}</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {item.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {item.description}
          </p>
        )}
        {item.triggers && item.triggers.length > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            🤖 {item.triggers.length} AI trigger{item.triggers.length > 1 ? "s" : ""}
          </p>
        )}
        {item.branch_name && status === "doing" && (
          <div className="flex items-center gap-2 mb-3">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {item.branch_name}
            </code>
          </div>
        )}
        {canManage && (
          <div className="flex gap-2 items-center">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doing">Doing</SelectItem>
                <SelectItem value="next-up">Next Up</SelectItem>
                <SelectItem value="someday">Someday</SelectItem>
                <SelectItem value="inbox">Inbox</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={item.have_state || "Want"} onValueChange={handleHaveStateChange}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Must">Must</SelectItem>
                <SelectItem value="Should">Should</SelectItem>
                <SelectItem value="Could">Could</SelectItem>
                <SelectItem value="Want">Want</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

