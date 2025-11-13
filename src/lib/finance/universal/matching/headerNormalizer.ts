/**
 * Normalize header string for fuzzy matching
 */
export function normalizeHeader(header: any): string {
  if (!header) return '';
  return String(header)
    .toLowerCase()
    .trim()
    // Remove PowerBI-specific characters first
    .replace(/['\[\]]/g, '')
    // Replace non-alphanumeric characters with underscore
    .replace(/[^a-z0-9]+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');
}
