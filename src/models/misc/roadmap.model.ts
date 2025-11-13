/**
 * Roadmap Model Layer
 * Type definitions for Roadmap page
 */

export interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  user_story: string | null;
  expected_results: string | null;
  display_order: number;
  is_active: boolean;
  department: string;
  category: string | null;
  triggers: string[];
  status?: string | null;
  have_state?: string | null;
  branch_name?: string | null;
}

export type Status = "doing" | "next-up" | "someday" | "inbox" | "done";
export type HaveState = "Must" | "Should" | "Could" | "Want";
export type ViewType = "status" | "have_state";

export interface RoadmapUpdate {
  id: string;
  status?: Status;
  have_state?: HaveState;
  display_order?: number;
  is_active?: boolean;
}



