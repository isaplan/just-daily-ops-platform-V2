/**
 * Roadmap View Layer
 * Pure presentational component - all business logic is in ViewModel
 */

"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { RoadmapItemCard } from "@/components/roadmap/RoadmapItemCard";
import { RoadmapFormSheet } from "@/components/roadmap/RoadmapFormSheet";
import { DndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRoadmapViewModel } from "@/viewmodels/misc/useRoadmapViewModel";
import { RoadmapItem } from "@/models/misc/roadmap.model";

function DroppableColumn({
  id,
  label,
  items,
  onEdit,
  canManage,
  onStatusChange,
  onHaveStateChange,
  viewType,
}: {
  id: string;
  label: string;
  items: RoadmapItem[];
  onEdit: (item: RoadmapItem) => void;
  canManage: boolean;
  onStatusChange?: () => void;
  onHaveStateChange?: () => void;
  viewType: "status" | "have_state";
}) {
  const { setNodeRef } = useDroppable({ id });

  // Don't render empty swimlanes
  if (items.length === 0) return null;

  return (
    <div ref={setNodeRef} className="w-full bg-muted/30 rounded-lg p-4 mb-6">
      <div className="font-semibold text-lg mb-4 flex items-center gap-2">
        {label}
        <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
      </div>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((item) => {
            const currentValue = viewType === "status" 
              ? (item.status || "inbox")
              : (item.have_state || "Want");
            
            return (
              <SortableItem
                key={item.id}
                item={item}
                status={item.status || "inbox"}
                currentValue={currentValue}
                onEdit={() => onEdit(item)}
                canManage={canManage}
                onStatusChange={onStatusChange}
                onHaveStateChange={onHaveStateChange}
              />
            );
          })}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableItem({
  item,
  status,
  currentValue,
  onEdit,
  canManage,
  onStatusChange,
  onHaveStateChange,
}: {
  item: RoadmapItem;
  status: string;
  currentValue: string;
  onEdit: () => void;
  canManage: boolean;
  onStatusChange?: () => void;
  onHaveStateChange?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <RoadmapItemCard 
        item={item} 
        status={status} 
        onEdit={onEdit} 
        canManage={canManage} 
        listeners={listeners}
        onStatusChange={onStatusChange}
        onHaveStateChange={onHaveStateChange}
      />
    </div>
  );
}

export default function RoadmapPage() {
  const {
    items,
    sheetOpen,
    setSheetOpen,
    editingItem,
    setEditingItem,
    activeId,
    viewType,
    setViewType,
    isOwner,
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
  } = useRoadmapViewModel();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Roadmap</h1>
          <p className="text-muted-foreground">
            Drag items between columns to change {viewType === "status" ? "status" : "have state"} • Use dropdown to update
          </p>
        </div>
        {isOwner && (
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Roadmap Item
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center mb-4">
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as "status" | "have_state")}>
          <TabsList>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="have_state">Have State</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-0">
          {viewType === "status" 
            ? STATUSES.map((status) => (
                <DroppableColumn
                  key={status}
                  id={status}
                  label={STATUS_LABELS[status]}
                  items={itemsByStatus[status] || []}
                  onEdit={handleEdit}
                  canManage={isOwner}
                  onStatusChange={refetch}
                  onHaveStateChange={refetch}
                  viewType="status"
                />
              ))
            : HAVE_STATES.map((haveState) => (
                <DroppableColumn
                  key={haveState}
                  id={haveState}
                  label={HAVE_STATE_LABELS[haveState]}
                  items={itemsByHaveState[haveState] || []}
                  onEdit={handleEdit}
                  canManage={isOwner}
                  onStatusChange={refetch}
                  onHaveStateChange={refetch}
                  viewType="have_state"
                />
              ))
          }
        </div>
      </DndContext>

      <RoadmapFormSheet open={sheetOpen} onOpenChange={setSheetOpen} item={editingItem} />
    </div>
  );
}
