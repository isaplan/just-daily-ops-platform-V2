// Simple in-memory cache for field mappings
const mappingCache = new Map<string, any>();

export function saveMappingCache(
  locationId: string,
  importType: string,
  headers: string[],
  mapping: any
) {
  const key = `${locationId}-${importType}`;
  mappingCache.set(key, { headers, mapping, timestamp: Date.now() });
}

export function loadMappingCache(
  locationId: string,
  importType: string
): { headers: string[]; mapping: any } | null {
  const key = `${locationId}-${importType}`;
  const cached = mappingCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
    return { headers: cached.headers, mapping: cached.mapping };
  }
  
  return null;
}

export function clearAllOldVersionCaches() {
  mappingCache.clear();
}