"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChartData {
  month: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  ebitda: number;
}

export default function RevenueChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChartData = async () => {
      try {
        setLoading(true);
        
        // Load P&L Monthly Summary data
        const { data: pnlData, error: pnlError } = await supabase
          .from("pnl_monthly_summary")
          .select("*")
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(12); // Last 12 months

        if (pnlError) {
          console.log("Chart data error:", pnlError);
          setError("Failed to load chart data");
          return;
        }

        // Transform data for chart
        const transformedData = (pnlData || []).map(item => ({
          month: `${item.year}-${String(item.month).padStart(2, '0')}`,
          revenue: item.revenue_net || item.revenue || 0,
          cogs: item.cogs_total || item.cogs || 0,
          grossProfit: (item.revenue_net || item.revenue || 0) - (item.cogs_total || item.cogs || 0),
          ebitda: (item.revenue_net || item.revenue || 0) - (item.cogs_total || item.cogs || 0) - (item.labor_cost_total || item.labor_cost || 0)
        })).reverse(); // Show chronologically

        setChartData(transformedData);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
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
        <div style={{ fontSize: '16px', color: '#3498db' }}>Loading chart data...</div>
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
        <h3>Chart Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>No chart data available</div>
      </div>
    );
  }

  // Calculate max value for scaling
  const maxValue = Math.max(
    ...chartData.map(d => Math.max(d.revenue, d.cogs, d.grossProfit, d.ebitda))
  );

  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '25px', 
      borderRadius: '12px', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '30px'
    }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '24px' }}>
        📊 Revenue & Profit Trends
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px',
        marginBottom: '20px'
      }}>
        {chartData.map((data, index) => (
          <div key={index} style={{
            border: '1px solid #e1e8ed',
            borderRadius: '8px',
            padding: '15px',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '10px' }}>
              {data.month}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>
                Revenue: {formatCurrency(data.revenue)}
              </span>
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <span style={{ color: '#dc3545' }}>
                COGS: {formatCurrency(data.cogs)}
              </span>
            </div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              <span style={{ color: '#17a2b8', fontWeight: 'bold' }}>
                Gross Profit: {formatCurrency(data.grossProfit)}
              </span>
            </div>
            <div style={{ fontSize: '14px' }}>
              <span style={{ color: '#6f42c1', fontWeight: 'bold' }}>
                EBITDA: {formatCurrency(data.ebitda)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Simple Bar Chart Visualization */}
      <div style={{ marginTop: '20px' }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Monthly Performance Overview</h3>
        <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '200px', borderBottom: '2px solid #e1e8ed', paddingBottom: '10px' }}>
          {chartData.map((data, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              flex: 1,
              gap: '2px'
            }}>
              {/* Revenue Bar */}
              <div style={{
                width: '100%',
                height: `${(data.revenue / maxValue) * 150}px`,
                backgroundColor: '#28a745',
                borderRadius: '4px 4px 0 0',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: '#28a745'
                }}>
                  {formatCurrency(data.revenue)}
                </div>
              </div>
              
              {/* COGS Bar */}
              <div style={{
                width: '100%',
                height: `${(data.cogs / maxValue) * 150}px`,
                backgroundColor: '#dc3545',
                borderRadius: '0 0 4px 4px'
              }}></div>
              
              <div style={{ 
                fontSize: '10px', 
                color: '#6c757d', 
                marginTop: '5px',
                textAlign: 'center',
                transform: 'rotate(-45deg)',
                whiteSpace: 'nowrap'
              }}>
                {data.month.split('-')[1]}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '20px', 
          marginTop: '15px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '2px' }}></div>
            <span>Revenue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#dc3545', borderRadius: '2px' }}></div>
            <span>COGS</span>
          </div>
        </div>
      </div>
    </div>
  );
}
