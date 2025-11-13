"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CategoryData {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export default function CategoryBreakdown() {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategoryData = async () => {
      try {
        setLoading(true);
        
        // Load P&L Line Items data
        const { data: lineItemsData, error: lineItemsError } = await supabase
          .from("pnl_line_items")
          .select("*")
          .limit(100);

        if (lineItemsError) {
          console.log("Category data error:", lineItemsError);
          setError("Failed to load category data");
          return;
        }

        // Group by category
        const categoryMap = new Map<string, { total: number; count: number }>();
        
        (lineItemsData || []).forEach((item: any) => {
          const category = item.category || 'Uncategorized';
          const amount = item.amount || 0;
          
          if (categoryMap.has(category)) {
            const existing = categoryMap.get(category)!;
            categoryMap.set(category, {
              total: existing.total + amount,
              count: existing.count + 1
            });
          } else {
            categoryMap.set(category, { total: amount, count: 1 });
          }
        });

        // Calculate total for percentages
        const totalAmount = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.total, 0);

        // Transform to array and sort by total amount
        const transformedData = Array.from(categoryMap.entries())
          .map(([category, data]) => ({
            category,
            totalAmount: data.total,
            count: data.count,
            percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount);

        setCategoryData(transformedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadCategoryData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '16px', color: '#3498db' }}>Loading category breakdown...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        backgroundColor: '#fee', 
        border: '1px solid #fcc', 
        padding: '20px', 
        borderRadius: '8px', 
        color: '#c33',
        textAlign: 'center'
      }}>
        <h3>Category Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (categoryData.length === 0) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>No category data available</div>
      </div>
    );
  }

  const colors = [
    '#667eea', '#f093fb', '#4facfe', '#fa709a', '#a8edea', 
    '#fed6e3', '#d299c2', '#fad0c4', '#ffecd2', '#fcb69f'
  ];

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '25px', 
      borderRadius: '12px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '30px'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '24px' }}>
        📈 Category Breakdown
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '15px',
        marginBottom: '20px'
      }}>
        {categoryData.map((data, index) => (
          <div key={index} style={{
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            padding: '20px',
            backgroundColor: '#f8f9fa',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Color indicator */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              backgroundColor: colors[index % colors.length]
            }}></div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '10px'
            }}>
              <h3 style={{ 
                margin: 0, 
                color: '#2c3e50', 
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                {data.category}
              </h3>
              <span style={{
                backgroundColor: colors[index % colors.length],
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {data.percentage.toFixed(1)}%
              </span>
            </div>
            
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px' }}>
              {formatCurrency(data.totalAmount)}
            </div>
            
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              {data.count} transactions
            </div>
            
            {/* Progress bar */}
            <div style={{
              marginTop: '10px',
              width: '100%',
              height: '6px',
              backgroundColor: '#e1e8ed',
              borderRadius: '3px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${data.percentage}%`,
                height: '100%',
                backgroundColor: colors[index % colors.length],
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #e1e8ed'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Summary</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '15px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {categoryData.length}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Categories</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {categoryData.reduce((sum, cat) => sum + cat.count, 0)}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Transactions</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50' }}>
              {formatCurrency(categoryData.reduce((sum, cat) => sum + cat.totalAmount, 0))}
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>Total Amount</div>
          </div>
        </div>
      </div>
    </div>
  );
}
