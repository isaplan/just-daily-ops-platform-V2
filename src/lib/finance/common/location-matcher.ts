export interface DetectedLocation {
  id: string;
  name: string;
  address?: string;
}

export interface DatabaseLocation {
  id: string;
  name: string;
}

/**
 * Matches extracted location name against database locations
 * Uses fuzzy matching with multiple strategies:
 * 1. Exact match (case-insensitive)
 * 2. Partial match (location name contains extracted name or vice versa)
 * 3. Common variations (Barbea/Bar-Bea, Kinsbergen/Kins Bergen, Lamour/L'Amour)
 */
export const matchLocation = async (
  extractedName: string,
  locations: DatabaseLocation[]
): Promise<DetectedLocation | null> => {
  if (!locations) return null;
  
  const normalizedExtracted = extractedName.toLowerCase().trim();
  
  // 1. Try exact match first
  let matched = locations.find(loc => 
    loc.name.toLowerCase().trim() === normalizedExtracted
  );
  
  if (matched) return { id: matched.id, name: matched.name };
  
  // 2. Try partial match - check if extracted name is contained in any location name
  matched = locations.find(loc => {
    const normalizedLoc = loc.name.toLowerCase().trim();
    return normalizedLoc.includes(normalizedExtracted) || 
           normalizedExtracted.includes(normalizedLoc);
  });
  
  if (matched) return { id: matched.id, name: matched.name };
  
  // 3. Try common variations and fuzzy patterns
  const variations = [
    normalizedExtracted.replace(/[-\s]/g, ''),  // Remove hyphens and spaces
    normalizedExtracted.replace(/'/g, ''),       // Remove apostrophes (L'Amour -> Lamour)
    normalizedExtracted.replace(/\s+/g, ''),     // Remove all spaces
  ];
  
  for (const variation of variations) {
    matched = locations.find(loc => {
      const normalizedLoc = loc.name.toLowerCase().trim();
      const locVariations = [
        normalizedLoc.replace(/[-\s]/g, ''),
        normalizedLoc.replace(/'/g, ''),
        normalizedLoc.replace(/\s+/g, ''),
      ];
      
      return locVariations.some(locVar => 
        locVar === variation || 
        locVar.includes(variation) || 
        variation.includes(locVar)
      );
    });
    
    if (matched) return { id: matched.id, name: matched.name };
  }
  
  return null;
};
