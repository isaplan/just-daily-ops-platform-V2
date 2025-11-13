/* 
  Upsert a top-priority Roadmap item for:
  "Unify entities + worker aggregates"

  Usage:
    npx tsx scripts/roadmap/add-unify-worker-aggregates.ts
*/
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { randomUUID } from "crypto";

// Load environment variables from .env.local
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or Supabase key env vars.");
  // eslint-disable-next-line no-console
  console.log("Available env vars:", Object.keys(process.env).filter((k) => k.includes("SUPABASE")));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // Check if item already exists by title
  const { data: existing } = await supabase
    .from("roadmap_items")
    .select("id")
    .eq("title", "Unify entities + worker aggregates")
    .single();

  const item = {
    ...(existing?.id && { id: existing.id }), // Update if exists, otherwise let DB generate UUID
    title: "Unify entities + worker aggregates",
    description:
      "Canonical unified IDs for locations/teams/users; editable worker profiles (contract type, contract hours, wage override); rolling 30d wages; edge function aggregates; align Hours/Costs on unified entities.",
    user_story:
      "As an operator, I need consistent identifiers and editable worker data so reports and costs match across Eitje, Bork, Formitable and APICBASE.",
    expected_results:
      "Unified filters in all data views; per-user effective hourly wage; stable location/team/worker links; no schema mismatch errors.",
    // Strong negative display_order to guarantee top position
    display_order: -10000,
    is_active: true, // doing = active
    department: "Data Platform",
    category: "Unification",
    triggers: ["compliance", "schema", "eitje", "bork", "inventory"],
    status: "doing",
    have_state: "Must",
    branch_name: "feat/unified-entities-worker-aggregates",
  } as any;

  // Use insert if new, update if exists
  let result;
  if (existing?.id) {
    result = await supabase
      .from("roadmap_items")
      .update(item)
      .eq("id", existing.id)
      .select("*")
      .single();
  } else {
    result = await supabase
      .from("roadmap_items")
      .insert(item)
      .select("*")
      .single();
  }

  const { data, error } = result;

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to upsert roadmap item:", error.message);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log("Upserted roadmap item:", data?.id);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


