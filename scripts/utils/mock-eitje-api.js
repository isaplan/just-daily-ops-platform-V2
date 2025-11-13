// MOCK EITJE API FOR TESTING
// Run with: node mock-eitje-api.js

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3003;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockSalesData = [
  {
    id: 'eitje-001',
    location_id: '550e8400-e29b-41d4-a716-446655440001',
    date: '2025-10-25',
    product_name: 'Eitje Product A',
    category: 'Electronics',
    quantity: 5,
    price: 29.99,
    revenue: 149.95,
    revenue_excl_vat: 123.93,
    revenue_incl_vat: 149.95,
    vat_rate: 21.0,
    vat_amount: 26.02,
    cost_price: 20.00
  },
  {
    id: 'eitje-002', 
    location_id: '550e8400-e29b-41d4-a716-446655440001',
    date: '2025-10-25',
    product_name: 'Eitje Product B',
    category: 'Accessories',
    quantity: 3,
    price: 15.50,
    revenue: 46.50,
    revenue_excl_vat: 38.43,
    revenue_incl_vat: 46.50,
    vat_rate: 21.0,
    vat_amount: 8.07,
    cost_price: 12.00
  }
];

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'mock-eitje-api'
  });
});

// Sales data endpoint
app.get('/sales', (req, res) => {
  const { start_date, end_date, location_id } = req.query;
  
  let filteredData = mockSalesData;
  
  if (start_date) {
    filteredData = filteredData.filter(item => item.date >= start_date);
  }
  
  if (end_date) {
    filteredData = filteredData.filter(item => item.date <= end_date);
  }
  
  if (location_id) {
    filteredData = filteredData.filter(item => item.location_id === location_id);
  }
  
  res.json({
    success: true,
    data: filteredData,
    total: filteredData.length,
    date_range: {
      start: start_date,
      end: end_date
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Eitje API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Sales data: http://localhost:${PORT}/sales`);
});
