const fetch = require('node-fetch');

async function testPnLPage() {
  try {
    console.log('Testing P&L page data loading...');
    
    // Test the API directly
    console.log('\n1. Testing aggregated data API...');
    const apiResponse = await fetch('http://localhost:3000/api/finance/pnl-aggregated-data?year=2025&location=all');
    const apiData = await apiResponse.json();
    console.log('API Response:', {
      success: apiData.success,
      dataLength: apiData.data?.length || 0,
      summary: apiData.summary
    });
    
    if (apiData.data && apiData.data.length > 0) {
      console.log('Sample record:', {
        location_id: apiData.data[0].location_id,
        year: apiData.data[0].year,
        month: apiData.data[0].month,
        revenue_food: apiData.data[0].revenue_food,
        revenue_beverage: apiData.data[0].revenue_beverage,
        resultaat: apiData.data[0].resultaat
      });
    }
    
    // Test the page
    console.log('\n2. Testing P&L page...');
    const pageResponse = await fetch('http://localhost:3000/finance/pnl/balance');
    const pageHtml = await pageResponse.text();
    
    // Check if table has data
    const hasTableData = pageHtml.includes('<tbody class="[&_tr:last-child]:border-0">') && 
                        !pageHtml.includes('<tbody class="[&_tr:last-child]:border-0"></tbody>');
    
    console.log('Page Response:', {
      status: pageResponse.status,
      hasTableData: hasTableData,
      tableBodyEmpty: pageHtml.includes('<tbody class="[&_tr:last-child]:border-0"></tbody>')
    });
    
    // Check for JavaScript errors in the HTML
    const hasScriptErrors = pageHtml.includes('error') || pageHtml.includes('Error');
    console.log('Has script errors:', hasScriptErrors);
    
  } catch (error) {
    console.error('Error testing P&L page:', error);
  }
}

testPnLPage();


