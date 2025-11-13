'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { category: 'Food Sales', revenue: 15000, costs: 9000, profit: 6000, margin: 40 },
  { category: 'Beverages', revenue: 8000, costs: 3200, profit: 4800, margin: 60 },
  { category: 'Desserts', revenue: 3000, costs: 1200, profit: 1800, margin: 60 },
  { category: 'Merchandise', revenue: 2000, costs: 1000, profit: 1000, margin: 50 }
];

export function ProfitLossChart() {
  return (
    <div className="space-y-6">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis tickFormatter={(value) => `$${value}`} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`, 
                name === 'revenue' ? 'Revenue' : name === 'costs' ? 'Costs' : 'Profit'
              ]}
            />
            <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
            <Bar dataKey="costs" fill="#ef4444" name="Costs" />
            <Bar dataKey="profit" fill="#10b981" name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            ${chartData.reduce((sum, cat) => sum + cat.revenue, 0).toLocaleString()}
          </div>
          <div className="text-sm text-blue-600">Total Revenue</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ${chartData.reduce((sum, cat) => sum + cat.profit, 0).toLocaleString()}
          </div>
          <div className="text-sm text-green-600">Total Profit</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            ${chartData.reduce((sum, cat) => sum + cat.costs, 0).toLocaleString()}
          </div>
          <div className="text-sm text-red-600">Total Costs</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {((chartData.reduce((sum, cat) => sum + cat.profit, 0) / chartData.reduce((sum, cat) => sum + cat.revenue, 0)) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-purple-600">Profit Margin</div>
        </div>
      </div>
    </div>
  );
}