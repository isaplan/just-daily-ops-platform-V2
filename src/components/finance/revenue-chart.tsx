'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { date: '2024-01-01', revenue: 1200, profit: 360, transactions: 45 },
  { date: '2024-01-02', revenue: 1500, profit: 450, transactions: 52 },
  { date: '2024-01-03', revenue: 1800, profit: 540, transactions: 61 },
  { date: '2024-01-04', revenue: 1600, profit: 480, transactions: 58 },
  { date: '2024-01-05', revenue: 2000, profit: 600, transactions: 72 },
  { date: '2024-01-06', revenue: 2200, profit: 660, transactions: 78 },
  { date: '2024-01-07', revenue: 1900, profit: 570, transactions: 68 }
];

export function RevenueChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis tickFormatter={(value) => `$${value}`} />
          <Tooltip 
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString()}`, 
              name === 'revenue' ? 'Revenue' : name === 'profit' ? 'Profit' : 'Transactions'
            ]}
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}