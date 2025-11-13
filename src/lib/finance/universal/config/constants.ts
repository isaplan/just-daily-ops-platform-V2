// Dutch month names for parsing
export const DUTCH_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6,
  juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12,
  jan: 1, feb: 2, mrt: 3, maa: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12
};

// Metadata blacklist - skip rows containing these exact terms
export const METADATA_BLACKLIST = [
  'Omschrijving',
  'dagelijkse_update',
  'boltnew',
  'financiele_gegevens',
  'Informatie:',
  'Geëxporteerd op'
];
