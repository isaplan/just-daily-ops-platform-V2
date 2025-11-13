const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const POWERBI_FILES_DIR = 'dev-docs/powerbi-upload-final-files-2023-2024-SEPT2025';

console.log('=== PowerBI COGS Verification Script ===\n');

// Location mapping (from existing code)
const LOCATION_MAPPING = {
  'kinsbergen': { uuid: '550e8400-e29b-41d4-a716-446655440001', name: 'Van Kinsbergen' },
  'barbea': { uuid: '550e8400-e29b-41d4-a716-446655440002', name: 'BarBea Labour' },
  'lamour': { uuid: '550e8400-e29b-41d4-a716-446655440003', name: "l'Amour-Toujour" }
};

// Expected main COGS categories
const EXPECTED_CATEGORIES = [
  'Netto-omzet',
  'Kostprijs van de omzet',
  'Lasten uit hoofde van personeelsbeloningen',
  'Overige bedrijfskosten',
  'Afschrijvingen op immateriële en materiële vaste activa',
  'Financiële baten en lasten',
  'Opbrengst van vorderingen die tot de vaste activa behoren en van effecten'
];

function detectLocationFromFile(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('kinsbergen')) return 'kinsbergen';
  if (lower.includes('barbea') || lower.includes('bar bea')) return 'barbea';
  if (lower.includes('amour') || lower.includes('toujours')) return 'lamour';
  return null;
}

function detectLocationFromExcelContent(data) {
  // Check first 5 rows for location indicators
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i] || [];
    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('van kinsbergen')) return 'kinsbergen';
    if (rowStr.includes('barbea') || rowStr.includes('bar bea')) return 'barbea';
    if (rowStr.includes('amour') || rowStr.includes('toujours')) return 'lamour';
  }
  return null;
}

function analyzeFile(fileName) {
  const filePath = path.join(POWERBI_FILES_DIR, fileName);
  const workbook = XLSX.readFile(filePath);
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  // Detect location from filename and content
  const locationFromFile = detectLocationFromFile(fileName);
  const locationFromContent = detectLocationFromExcelContent(data);
  const detectedLocation = locationFromFile || locationFromContent;

  // Find header row
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(15, data.length); r++) {
    const row = data[r] || [];
    const cells = Array.isArray(row) ? row.map(c => (c || '').toString().toLowerCase()) : [(row || '').toString().toLowerCase()];
    const hasRgsSchema = cells.some(c => /rgs-schema.*rgsniveau2/i.test(c));
    const hasGrootboek = cells.some(c => /^grootboek$/i.test(c));
    
    if (hasRgsSchema && hasGrootboek && Array.isArray(row) && row.length > 3) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.log(`❌ ${fileName}: No header row found`);
    return null;
  }

  // Extract GL accounts (main categories)
  const glAccounts = new Set();
  const categories = new Set();
  const subcategories = new Set();
  
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i] || [];
    if (!row || row.length === 0) continue;
    
    const glAccount = (row[0] || '').toString().trim();
    const category = (row[1] || '').toString().trim();
    const subcategory = (row[2] || '').toString().trim();
    
    if (glAccount && glAccount !== "'RGS-Schema'[RGSNiveau2]") {
      glAccounts.add(glAccount);
    }
    if (category && category !== "'RGS-Schema'[RGSNiveau3]") {
      categories.add(category);
    }
    if (subcategory && subcategory !== 'Grootboek') {
      subcategories.add(subcategory);
    }
  }

  return {
    fileName,
    detectedLocation,
    locationFromFile,
    locationFromContent,
    headerRowIndex,
    glAccounts: Array.from(glAccounts).sort(),
    categories: Array.from(categories).sort(),
    subcategories: Array.from(subcategories).sort(),
    totalRows: data.length,
    dataRows: data.length - headerRowIndex - 1
  };
}

// Analyze all files
const files = fs.readdirSync(POWERBI_FILES_DIR).filter(f => f.endsWith('.xlsx')).sort();
const results = [];

console.log(`Found ${files.length} Excel files to analyze:\n`);

for (const fileName of files) {
  const result = analyzeFile(fileName);
  if (result) {
    results.push(result);
    console.log(`📊 ${fileName}:`);
    console.log(`   Location: ${result.detectedLocation || 'Unknown'} (file: ${result.locationFromFile}, content: ${result.locationFromContent})`);
    console.log(`   GL Accounts: ${result.glAccounts.length}`);
    console.log(`   Categories: ${result.categories.length}`);
    console.log(`   Subcategories: ${result.subcategories.length}`);
    console.log(`   Data rows: ${result.dataRows}`);
    console.log();
  }
}

// Group by location
const locationGroups = {};
for (const result of results) {
  if (result.detectedLocation) {
    if (!locationGroups[result.detectedLocation]) {
      locationGroups[result.detectedLocation] = [];
    }
    locationGroups[result.detectedLocation].push(result);
  }
}

console.log('=== LOCATION ANALYSIS ===\n');

for (const [locationKey, locationResults] of Object.entries(locationGroups)) {
  const locationInfo = LOCATION_MAPPING[locationKey];
  console.log(`🏢 ${locationInfo.name} (${locationKey}):`);
  console.log(`   UUID: ${locationInfo.uuid}`);
  console.log(`   Files: ${locationResults.map(r => r.fileName).join(', ')}`);
  
  // Combine all GL accounts from this location
  const allGlAccounts = new Set();
  const allCategories = new Set();
  const allSubcategories = new Set();
  
  for (const result of locationResults) {
    result.glAccounts.forEach(acc => allGlAccounts.add(acc));
    result.categories.forEach(cat => allCategories.add(cat));
    result.subcategories.forEach(sub => allSubcategories.add(sub));
  }
  
  console.log(`   Total GL Accounts: ${allGlAccounts.size}`);
  console.log(`   Total Categories: ${allCategories.size}`);
  console.log(`   Total Subcategories: ${allSubcategories.size}`);
  
  // Check against expected categories
  const missingCategories = EXPECTED_CATEGORIES.filter(expected => 
    !Array.from(allGlAccounts).some(actual => actual.includes(expected.split(' ')[0]))
  );
  
  console.log(`   ✅ Found categories: ${Array.from(allGlAccounts).join(', ')}`);
  if (missingCategories.length > 0) {
    console.log(`   ❌ Missing categories: ${missingCategories.join(', ')}`);
  } else {
    console.log(`   ✅ All expected categories present!`);
  }
  
  // Check Overige bedrijfskosten subcategories
  const overigeSubcategories = Array.from(allSubcategories).filter(sub => 
    sub.toLowerCase().includes('overige') || 
    sub.toLowerCase().includes('bedrijfskosten') ||
    sub.toLowerCase().includes('huisvesting') ||
    sub.toLowerCase().includes('verkoop') ||
    sub.toLowerCase().includes('kantoor') ||
    sub.toLowerCase().includes('exploitatie') ||
    sub.toLowerCase().includes('accountant') ||
    sub.toLowerCase().includes('personeel') ||
    sub.toLowerCase().includes('assurantie') ||
    sub.toLowerCase().includes('auto') ||
    sub.toLowerCase().includes('administratief') ||
    sub.toLowerCase().includes('andere') ||
    sub.toLowerCase().includes('werk')
  );
  
  console.log(`   📋 Overige bedrijfskosten subcategories: ${overigeSubcategories.length}`);
  if (overigeSubcategories.length > 0) {
    console.log(`      ${overigeSubcategories.slice(0, 5).join(', ')}${overigeSubcategories.length > 5 ? '...' : ''}`);
  }
  
  console.log();
}

console.log('=== SUMMARY ===\n');
console.log(`Total files analyzed: ${results.length}`);
console.log(`Locations detected: ${Object.keys(locationGroups).length}`);
console.log(`Expected locations: 3 (Kinsbergen, BarBea, l'Amour)`);

const allDetectedLocations = Object.keys(locationGroups);
const expectedLocations = Object.keys(LOCATION_MAPPING);
const missingLocations = expectedLocations.filter(loc => !allDetectedLocations.includes(loc));

if (missingLocations.length > 0) {
  console.log(`❌ Missing locations: ${missingLocations.join(', ')}`);
} else {
  console.log(`✅ All expected locations detected!`);
}

console.log('\n=== NEXT STEPS ===');
console.log('1. Verify all 7 main COGS categories are present for each location');
console.log('2. Check that subcategory breakdown is complete (especially Overige bedrijfskosten)');
console.log('3. Proceed with Phase 4: Clear and re-import all data with correct location UUIDs');
