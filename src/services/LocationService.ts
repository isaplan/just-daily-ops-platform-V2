import { createClient } from "@/integrations/supabase/client";

const supabase = createClient();

export interface Location {
  id: string;
  name: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export class LocationService {
  static async getAll(): Promise<Location[]> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    return data || [];
  }

  static async getById(id: string): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching location:', error);
      return null;
    }

    return data;
  }

  static async matchLocationFuzzy(searchName: string): Promise<Location | null> {
    if (!searchName) return null;

    // First try exact match
    const { data: exactMatch } = await supabase
      .from('locations')
      .select('*')
      .ilike('name', searchName)
      .single();

    if (exactMatch) return exactMatch;

    // Try fuzzy matching
    const { data: fuzzyMatches } = await supabase
      .from('locations')
      .select('*')
      .ilike('name', `%${searchName}%`);

    if (fuzzyMatches && fuzzyMatches.length > 0) {
      return fuzzyMatches[0];
    }

    return null;
  }

  static async create(location: Omit<Location, 'id' | 'created_at' | 'updated_at'>): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .insert([location])
      .select()
      .single();

    if (error) {
      console.error('Error creating location:', error);
      return null;
    }

    return data;
  }

  static async update(id: string, updates: Partial<Location>): Promise<Location | null> {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating location:', error);
      return null;
    }

    return data;
  }

  static async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting location:', error);
      return false;
    }

    return true;
  }
}

