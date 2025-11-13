/**
 * Roadmap Service Layer
 * Data fetching and mutation functions for Roadmap page
 */

import { createClient } from "@/integrations/supabase/client";
import { RoadmapItem, RoadmapUpdate } from "@/models/misc/roadmap.model";

/**
 * Fetch all roadmap items
 */
export async function fetchRoadmapItems(): Promise<RoadmapItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roadmap_items")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;

  // Sort by have_state priority then by display_order
  const haveStatePriority: Record<string, number> = {
    Must: 0,
    Should: 1,
    Could: 2,
    Want: 3,
  };

  const sortedData = [...(data || [])].sort((a, b) => {
    const aPriority = haveStatePriority[a.have_state || "Want"] ?? 3;
    const bPriority = haveStatePriority[b.have_state || "Want"] ?? 3;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a.display_order - b.display_order;
  });

  return sortedData as RoadmapItem[];
}

/**
 * Update roadmap item
 */
export async function updateRoadmapItem(update: RoadmapUpdate): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("roadmap_items")
    .update(update)
    .eq("id", update.id);

  if (error) throw error;
}

/**
 * Update multiple roadmap items (for reordering)
 */
export async function updateRoadmapItems(updates: RoadmapUpdate[]): Promise<void> {
  const supabase = createClient();
  
  for (const update of updates) {
    const { error } = await supabase
      .from("roadmap_items")
      .update({ display_order: update.display_order })
      .eq("id", update.id);

    if (error) throw error;
  }
}

/**
 * Subscribe to roadmap items changes
 */
export function subscribeToRoadmapChanges(callback: () => void) {
  const supabase = createClient();
  const subscription = supabase
    .channel("roadmap_items_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_items" }, callback)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}



