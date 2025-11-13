/**
 * V2 Worker Profiles Service
 * CRUD operations for worker profiles
 */

import { createClient } from '@/integrations/supabase/server';

export interface WorkerProfile {
  id?: number;
  eitje_user_id: number;
  location_id?: string;
  contract_type?: string;
  contract_hours?: number;
  hourly_wage?: number;
  wage_override: boolean;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GetHourlyRateOptions {
  eitjeUserId: number;
  date?: string; // YYYY-MM-DD
  locationId?: string;
}

/**
 * Get hourly rate for a user
 * Priority: worker_profiles (if wage_override) > calculated > fallback
 */
export async function getHourlyRateForUser(
  options: GetHourlyRateOptions
): Promise<number | null> {
  try {
    const supabase = await createClient();

    // Check worker_profiles for override
    let query = supabase
      .from('worker_profiles')
      .select('hourly_wage')
      .eq('eitje_user_id', options.eitjeUserId)
      .eq('wage_override', true);

    if (options.date) {
      query = query
        .or(`effective_to.is.null,effective_to.gte.${options.date}`)
        .or(`effective_from.is.null,effective_from.lte.${options.date}`);
    } else {
      query = query.is('effective_to', null);
    }

    if (options.locationId) {
      query = query.eq('location_id', options.locationId);
    }

    query = query.order('effective_from', { ascending: false, nullsFirst: false })
                 .limit(1);

    const { data, error } = await query;

    if (error) {
      console.error('[Worker Profiles Service] Error fetching hourly rate:', error);
      return null;
    }

    if (data && data.length > 0 && data[0].hourly_wage) {
      return data[0].hourly_wage;
    }

    // No override found, return null (caller should calculate from wage_cost/hours)
    return null;

  } catch (error) {
    console.error('[Worker Profiles Service] Unexpected error:', error);
    return null;
  }
}

/**
 * Get worker profile by ID
 */
export async function getWorkerProfile(id: number): Promise<WorkerProfile | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('worker_profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[Worker Profiles Service] Error:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('[Worker Profiles Service] Unexpected error:', error);
    return null;
  }
}

/**
 * Create worker profile
 */
export async function createWorkerProfile(
  profile: Omit<WorkerProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<WorkerProfile | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('worker_profiles')
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('[Worker Profiles Service] Error:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('[Worker Profiles Service] Unexpected error:', error);
    return null;
  }
}

/**
 * Update worker profile
 */
export async function updateWorkerProfile(
  id: number,
  updates: Partial<WorkerProfile>
): Promise<WorkerProfile | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('worker_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Worker Profiles Service] Error:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('[Worker Profiles Service] Unexpected error:', error);
    return null;
  }
}

/**
 * Delete worker profile
 */
export async function deleteWorkerProfile(id: number): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('worker_profiles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Worker Profiles Service] Error:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[Worker Profiles Service] Unexpected error:', error);
    return false;
  }
}

