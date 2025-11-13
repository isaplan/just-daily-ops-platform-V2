'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const chartData = [
  { category: 'Food', value: 25000, color: '#3b82f6' },
  { category: 'Beverages', value: 12000, color: '#10b981' },
  { category: 'Desserts', value: 5000, color: '#f59e0b' },
  { category: 'Appetizers', value: 3000, color: '#ef4444' }
];

export function SalesByCategoryChart() {
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ category, value }) => `${category}: $${value.toLocaleString()}`}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Sales']}
            labelFormatter={(label) => `Category: ${label}`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {chartData.map((item, index) => (
          <div key={item.category} className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm font-medium">{item.category}</span>
            </div>
            <div className="text-lg font-bold">${item.value.toLocaleString()}</div>
            <div className="text-xs text-gray-500">
              {((item.value / total) * 100).toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}