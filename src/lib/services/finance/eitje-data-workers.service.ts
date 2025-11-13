/**
 * Finance Eitje Data Workers Service Layer
 * Data fetching functions for Eitje workers data
 */

import { createClient } from "@/integrations/supabase/client";
import type {
  WorkerRecord,
  WorkersDataResponse,
  WorkersQueryParams,
} from "@/models/finance/eitje-data-workers.model";

const ITEMS_PER_PAGE = 50;

/**
 * Fetch workers data with pagination
 */
export async function fetchWorkersData(params: WorkersQueryParams): Promise<WorkersDataResponse> {
  const supabase = createClient();

  const from = (params.page - 1) * params.itemsPerPage;
  const to = from + params.itemsPerPage - 1;

  const { data: records, error: queryError, count } = await supabase
    .from("eitje_users")
    .select(
      `
      id,
      eitje_id,
      first_name,
      last_name,
      email,
      phone,
      employee_number,
      hire_date,
      is_active,
      raw_data,
      created_at,
      updated_at
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (queryError) throw queryError;

  return {
    records: records || [],
    total: count || 0,
  };
}



