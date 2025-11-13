/**
 * Roadmap ViewModel Layer
 * Business logic for Roadmap page
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRoadmapItems,
  updateRoadmapItem,
  updateRoadmapItems,
  subscribeToRoadmapChanges,
} from "@/lib/services/misc/roadmap.service";
import {
  RoadmapItem,
  Status,
  HaveState,
  ViewType,
  RoadmapUpdate,
} from "@/models/misc/roadmap.model";
import { useUserRole } from "@/hooks/useUserRole";
import { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

const STATUSES: Status[] = ["doing", "next-up", "someday", "inbox", "done"];
const STATUS_LABELS: Record<string, string> = {
  doing: "Doing",
  "next-up": "Next Up",
  someday: "Someday",
  inbox: "Inbox",
  done: "Done",
};

const HAVE_STATES: HaveState[] = ["Must", "Should", "Could", "Want"];
const HAVE_STATE_LABELS: Record<string, string> = {
  Must: "Must Have",
  Should: "Should Have",
  Could: "Could Have",
  Want: "Want",
};

const haveStatePriority: Record<string, number> = {
  Must: 0,
  Should: 1,
  Could: 2,
  Want: 3,
};

export function useRoadmapViewModel() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewType, setViewType] = useState<ViewType>("status");
  const { isOwner } = useUserRole();

  // Fetch roadmap items
  const { data: items = [], refetch } = useQuery<RoadmapItem[]>({
    queryKey: ["roadmap-items"],
    queryFn: fetchRoadmapItems,
    staleTime: 1 * 60 * 1000,
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = subscribeToRoadmapChanges(() => {
      refetch();
    });

    return unsubscribe;
  }, [refetch]);

  // Group items by status
  const itemsByStatus = useMemo(() => {
    return STATUSES.reduce((acc, status) => {
      acc[status] = items
        .filter((item) => (item.status || "inbox") === status)
        .sort((a, b) => {
          const aPriority = haveStatePriority[a.have_state || "Want"] ?? 3;
          const bPriority = haveStatePriority[b.have_state || "Want"] ?? 3;
          if (aPriority !== bPriority) {
            return aPriority - bPriority;
          }
          return a.display_order - b.display_order;
        });
      return acc;
    }, {} as Record<string, RoadmapItem[]>);
  }, [items]);

  // Group items by have_state
  const itemsByHaveState = useMemo(() => {
    return HAVE_STATES.reduce((acc, haveState) => {
      acc[haveState] = items
        .filter((item) => (item.have_state || "Want") === haveState)
        .sort((a, b) => a.display_order - b.display_order);
      return acc;
    }, {} as Record<string, RoadmapItem[]>);
  }, [items]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const activeItem = items.find((item) => item.id === activeId);
      if (!activeItem) return;

      if (viewType === "status") {
        // STATUS VIEW
        const overStatus = STATUSES.find((status) => overId === status);

        if (overStatus) {
          // Dropped on a column
          try {
            await updateRoadmapItem({
              id: activeId,
              status: overStatus,
              is_active: overStatus === "doing",
            });
            toast.success(`Moved to ${STATUS_LABELS[overStatus]}`);
            refetch();
          } catch (error) {
            toast.error("Failed to update status");
          }
          return;
        }

        // Dropped on another item
        const overItem = items.find((item) => item.id === overId);
        if (!overItem) return;

        const activeStatus = activeItem.status || "inbox";
        const overItemStatus = overItem.status || "inbox";

        if (activeStatus === overItemStatus) {
          // Same column - reorder
          const statusItems = itemsByStatus[activeStatus];
          const oldIndex = statusItems.findIndex((item) => item.id === activeId);
          const newIndex = statusItems.findIndex((item) => item.id === overId);

          if (oldIndex === newIndex) return;

          const reorderedItems = [...statusItems];
          const [moved] = reorderedItems.splice(oldIndex, 1);
          reorderedItems.splice(newIndex, 0, moved);

          const updates = reorderedItems.map((item, index) => ({
            id: item.id,
            display_order: index,
          }));

          try {
            await updateRoadmapItems(updates);
            toast.success("Reordered");
            refetch();
          } catch (error) {
            toast.error("Failed to reorder");
          }
        } else {
          // Different column - change status
          const overStatusItems = itemsByStatus[overItemStatus];
          const newDisplayOrder =
            overStatusItems.length > 0 ? Math.max(...overStatusItems.map((i) => i.display_order)) + 1 : 0;

          try {
            await updateRoadmapItem({
              id: activeId,
              status: overItemStatus,
              is_active: overItemStatus === "doing",
              display_order: newDisplayOrder,
            });
            toast.success(`Moved to ${STATUS_LABELS[overItemStatus]}`);
            refetch();
          } catch (error) {
            toast.error("Failed to move item");
          }
        }
      } else {
        // HAVE_STATE VIEW
        const overHaveState = HAVE_STATES.find((state) => overId === state);

        if (overHaveState) {
          // Dropped on a column
          try {
            await updateRoadmapItem({
              id: activeId,
              have_state: overHaveState,
            });
            toast.success(`Moved to ${HAVE_STATE_LABELS[overHaveState]}`);
            refetch();
          } catch (error) {
            toast.error("Failed to update have state");
          }
          return;
        }

        // Dropped on another item
        const overItem = items.find((item) => item.id === overId);
        if (!overItem) return;

        const activeHaveState = activeItem.have_state || "Want";
        const overItemHaveState = overItem.have_state || "Want";

        if (activeHaveState === overItemHaveState) {
          // Same column - reorder
          const haveStateItems = itemsByHaveState[activeHaveState];
          const oldIndex = haveStateItems.findIndex((item) => item.id === activeId);
          const newIndex = haveStateItems.findIndex((item) => item.id === overId);

          if (oldIndex === newIndex) return;

          const reorderedItems = [...haveStateItems];
          const [moved] = reorderedItems.splice(oldIndex, 1);
          reorderedItems.splice(newIndex, 0, moved);

          const updates = reorderedItems.map((item, index) => ({
            id: item.id,
            display_order: index,
          }));

          try {
            await updateRoadmapItems(updates);
            toast.success("Reordered");
            refetch();
          } catch (error) {
            toast.error("Failed to reorder");
          }
        } else {
          // Different column - change have_state
          const overHaveStateItems = itemsByHaveState[overItemHaveState];
          const newDisplayOrder =
            overHaveStateItems.length > 0
              ? Math.max(...overHaveStateItems.map((i) => i.display_order)) + 1
              : 0;

          try {
            await updateRoadmapItem({
              id: activeId,
              have_state: overItemHaveState,
              display_order: newDisplayOrder,
            });
            toast.success(`Moved to ${HAVE_STATE_LABELS[overItemHaveState]}`);
            refetch();
          } catch (error) {
            toast.error("Failed to move item");
          }
        }
      }
    },
    [items, viewType, itemsByStatus, itemsByHaveState, refetch]
  );

  const handleEdit = useCallback((item: RoadmapItem) => {
    setEditingItem(item);
    setSheetOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingItem(null);
    setSheetOpen(true);
  }, []);

  return {
    items,
    sheetOpen,
    setSheetOpen,
    editingItem,
    setEditingItem,
    activeId,
    viewType,
    setViewType,
    isOwner: isOwner(),
    itemsByStatus,
    itemsByHaveState,
    STATUSES,
    STATUS_LABELS,
    HAVE_STATES,
    HAVE_STATE_LABELS,
    handleDragStart,
    handleDragEnd,
    handleEdit,
    handleAddNew,
    refetch,
  };
}



