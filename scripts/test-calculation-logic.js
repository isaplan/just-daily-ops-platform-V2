/**
 * Test the calculation logic directly to see what it produces
 */

// Simulate the sumBySubcategories function with deduplication
function sumBySubcategories(data, subcategories) {
  const uniqueRecordKeys = new Set();
  let total = 0;
  
  data.forEach(d => {
    let shouldInclude = false;
    
    if (d.subcategory && subcategories.includes(d.subcategory)) {
      shouldInclude = true;
    } else if (d.category && subcategories.includes(d.category)) {
      shouldInclude = true;
    }
    
    if (shouldInclude) {
      const uniqueKey = `${d.category}|${d.subcategory || ''}|${d.gl_account || ''}|${d.amount || 0}`;
      
      if (!uniqueRecordKeys.has(uniqueKey)) {
        uniqueRecordKeys.add(uniqueKey);
        total += (d.amount || 0);
      }
    }
  });
  
  return total;
}

// Test with sample data
const testData = [
  { category: 'Netto-omzet uit leveringen geproduceerde goederen', subcategory: 'Omzet snacks (btw laag)', gl_account: 'Overige bedrijfskosten', amount: 10158 },
  { category: 'Netto-omzet uit leveringen geproduceerde goederen', subcategory: 'Omzet snacks (btw laag)', gl_account: 'Overige bedrijfskosten', amount: 10158 }, // duplicate
  { category: 'Netto-omzet uit leveringen geproduceerde goederen', subcategory: 'Omzet lunch (btw laag)', gl_account: 'Overige bedrijfskosten', amount: 14790 },
  { category: 'Netto-omzet uit leveringen geproduceerde goederen', subcategory: 'Omzet lunch (btw laag)', gl_account: 'Overige bedrijfskosten', amount: 14790 }, // duplicate
];

const categories = ['Omzet snacks (btw laag)', 'Omzet lunch (btw laag)'];
const result = sumBySubcategories(testData, categories);

console.log('Test data:', testData.length, 'records');
console.log('After deduplication:', result);
console.log('Expected (10158 + 14790):', 10158 + 14790);
console.log('Match:', result === (10158 + 14790) ? '✅' : '❌');



