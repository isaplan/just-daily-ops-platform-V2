'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Download
} from 'lucide-react';

export function FinancialAnalytics() {
  const analyticsData = {
    totalRevenue: 45000,
    totalProfit: 13500,
    profitMargin: 30,
    transactionCount: 1250,
    averageTransaction: 36,
    revenueGrowth: 12.5,
    profitGrowth: 8.3,
    topCategories: [
      { category: 'Food', revenue: 25000, percentage: 55.6 },
      { category: 'Beverages', revenue: 12000, percentage: 26.7 },
      { category: 'Desserts', revenue: 5000, percentage: 11.1 },
      { category: 'Appetizers', revenue: 3000, percentage: 6.7 }
    ]
  };

  const handleExport = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Revenue', analyticsData.totalRevenue],
      ['Total Profit', analyticsData.totalProfit],
      ['Profit Margin', `${analyticsData.profitMargin.toFixed(2)}%`],
      ['Transaction Count', analyticsData.transactionCount],
      ['Average Transaction', analyticsData.averageTransaction],
      ['Revenue Growth', `${analyticsData.revenueGrowth}%`],
      ['Profit Growth', `${analyticsData.profitGrowth}%`]
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial-analytics.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Analytics</h2>
          <p className="text-gray-600">Comprehensive financial insights and trends</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+{analyticsData.revenueGrowth}%</span>
              <span className="ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.totalProfit.toLocaleString()}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-500">+{analyticsData.profitGrowth}%</span>
              <span className="ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.profitMargin > 20 ? 'Excellent' : 
               analyticsData.profitMargin > 10 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsData.averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {analyticsData.transactionCount.toLocaleString()} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {analyticsData.topCategories.map((category, index) => (
            <div key={category.category} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div className="flex items-center space-x-3">
                <Badge variant="outline">#{index + 1}</Badge>
                <span className="font-medium">{category.category}</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">${category.revenue.toLocaleString()}</div>
                <div className="text-sm text-gray-500">{category.percentage.toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}