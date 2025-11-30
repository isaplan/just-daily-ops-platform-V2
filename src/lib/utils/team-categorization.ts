/**
 * Team Categorization Utility
 * Maps team names to main categories (Kitchen/Service/Management/Other)
 * Handles special cases like "Afwas" (50/50 split) and "Algemeen" (mapped to Ziek)
 */

export type TeamCategory = 'Kitchen' | 'Service' | 'Management' | 'Other';

export interface TeamCategorySplit {
  kitchen: number;
  service: number;
}

/**
 * Team name normalization - handles special mappings
 */
export function normalizeTeamName(teamName: string | null | undefined): string {
  if (!teamName) return '';
  
  const normalized = teamName.trim();
  
  // Map "Algemeen" to "Ziek" (sick leave category)
  if (normalized.toLowerCase() === 'algemeen') {
    return 'Ziek';
  }
  
  return normalized;
}

/**
 * Get team category for a given team name
 * Returns the main category (Kitchen/Service/Management/Other)
 */
export function getTeamCategory(teamName: string | null | undefined): TeamCategory {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return 'Other';
  
  const lower = normalized.toLowerCase();
  
  // Kitchen teams
  if (lower === 'keuken') {
    return 'Kitchen';
  }
  
  // Service teams
  if (lower === 'bediening' || lower === 'bar') {
    return 'Service';
  }
  
  // Management teams
  if (
    lower === 'management' ||
    lower === 'hk' ||
    lower === 'hr' ||
    lower === 'bestellingen' ||
    lower === 'stock'
  ) {
    return 'Management';
  }
  
  // Other teams (leave types)
  if (
    lower === 'verlof' ||
    lower === 'ziek' ||
    lower === 'bijzonder verlof' ||
    lower === 'bijzonder'
  ) {
    return 'Other';
  }
  
  // Afwas (dishwashing) - special case, handled separately
  if (lower === 'afwas') {
    // Default to Kitchen for categorization, but use split for calculations
    return 'Kitchen';
  }
  
  // Default to Other for unknown teams
  return 'Other';
}

/**
 * Get team category split for teams that belong to multiple categories
 * Returns null if team doesn't have a split
 * 
 * Example: "Afwas" = 50% Kitchen, 50% Service
 */
export function getTeamCategorySplit(teamName: string | null | undefined): TeamCategorySplit | null {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return null;
  
  const lower = normalized.toLowerCase();
  
  // Afwas (dishwashing) = 50% Kitchen, 50% Service
  if (lower === 'afwas') {
    return {
      kitchen: 0.5,
      service: 0.5,
    };
  }
  
  // No split for other teams
  return null;
}

/**
 * Get all sub-teams for a given category
 */
export function getSubTeams(category: TeamCategory): string[] {
  switch (category) {
    case 'Kitchen':
      return ['Keuken', 'Afwas']; // Afwas is 50% split but listed here too
    
    case 'Service':
      return ['Bediening', 'Bar', 'Afwas']; // Afwas is 50% split but listed here too
    
    case 'Management':
      return ['Management', 'HK', 'HR', 'Bestellingen', 'Stock'];
    
    case 'Other':
      return ['Verlof', 'Ziek', 'Algemeen', 'Bijzonder Verlof'];
    
    default:
      return [];
  }
}

/**
 * Check if a team name belongs to a specific category
 */
export function isTeamInCategory(teamName: string | null | undefined, category: TeamCategory): boolean {
  const teamCategory = getTeamCategory(teamName);
  
  // Special handling for Afwas - it belongs to both Kitchen and Service
  if (teamName && teamName.toLowerCase() === 'afwas') {
    return category === 'Kitchen' || category === 'Service';
  }
  
  return teamCategory === category;
}

/**
 * Get all team categories
 */
export function getAllTeamCategories(): TeamCategory[] {
  return ['Kitchen', 'Service', 'Management', 'Other'];
}

/**
 * Get display name for a team category
 */
export function getCategoryDisplayName(category: TeamCategory): string {
  switch (category) {
    case 'Kitchen':
      return 'Kitchen';
    case 'Service':
      return 'Service';
    case 'Management':
      return 'Management';
    case 'Other':
      return 'Other';
    default:
      return category;
  }
}











