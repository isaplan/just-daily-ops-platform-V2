import { NextResponse } from 'next/server';
import { getOrdersData } from '@/lib/payments/db';
import type { Order } from '@/lib/payments/types';

interface SalesStats {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  failedOrders: number;
  averageOrderValue: number;
  ordersByStatus: {
    completed: number;
    pending: number;
    failed: number;
    cancelled: number;
  };
  revenueByStatus: {
    completed: number;
    pending: number;
    failed: number;
    cancelled: number;
  };
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  recentOrders: Order[];
}

export async function GET() {
  try {
    const data = await getOrdersData();
    const orders = data.orders || [];

    // Calculate statistics
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const failedOrders = orders.filter(o => o.status === 'failed').length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Orders by status
    const ordersByStatus = {
      completed: orders.filter(o => o.status === 'completed').length,
      pending: orders.filter(o => o.status === 'pending').length,
      failed: orders.filter(o => o.status === 'failed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    };

    // Revenue by status
    const revenueByStatus = {
      completed: orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0),
      pending: orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total, 0),
      failed: orders.filter(o => o.status === 'failed').reduce((sum, o) => sum + o.total, 0),
      cancelled: orders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + o.total, 0),
    };

    // Top products
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    orders.forEach(order => {
      order.products.forEach(item => {
        const existing = productMap.get(item.product.id) || { name: item.product.name, quantity: 0, revenue: 0 };
        productMap.set(item.product.id, {
          name: item.product.name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + (item.product.price * item.quantity),
        });
      });
    });

    const topProducts = Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Recent orders (last 10)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const stats: SalesStats = {
      totalRevenue,
      totalOrders,
      completedOrders,
      pendingOrders,
      failedOrders,
      averageOrderValue,
      ordersByStatus,
      revenueByStatus,
      topProducts,
      recentOrders,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales statistics' },
      { status: 500 }
    );
  }
}

