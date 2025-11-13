import { promises as fs } from 'fs';
import path from 'path';
import type { Product, Order, PaymentSession } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Products
export async function getProducts(): Promise<Product[]> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(PRODUCTS_FILE, 'utf-8');
    const data = JSON.parse(fileContent);
    return data.products || [];
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getProducts();
  return products.find(p => p.id === id) || null;
}

// Orders
export interface OrdersData {
  orders: Order[];
  sessions: PaymentSession[];
}

export async function getOrdersData(): Promise<OrdersData> {
  await ensureDataDir();
  try {
    const fileContent = await fs.readFile(ORDERS_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return { orders: [], sessions: [] };
  }
}

async function saveOrdersData(data: OrdersData): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function createOrder(order: Order): Promise<Order> {
  const data = await getOrdersData();
  data.orders.push(order);
  await saveOrdersData(data);
  return order;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const data = await getOrdersData();
  return data.orders.find(o => o.id === id) || null;
}

export async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
  const data = await getOrdersData();
  const index = data.orders.findIndex(o => o.id === id);
  if (index === -1) return null;
  
  data.orders[index] = { ...data.orders[index], ...updates, updatedAt: new Date().toISOString() };
  await saveOrdersData(data);
  return data.orders[index];
}

// Payment Sessions
export async function createPaymentSession(session: PaymentSession): Promise<PaymentSession> {
  const data = await getOrdersData();
  data.sessions = data.sessions || [];
  data.sessions.push(session);
  await saveOrdersData(data);
  return session;
}

export async function getPaymentSessionById(id: string): Promise<PaymentSession | null> {
  const data = await getOrdersData();
  return data.sessions?.find(s => s.id === id) || null;
}

export async function updatePaymentSession(id: string, updates: Partial<PaymentSession>): Promise<PaymentSession | null> {
  const data = await getOrdersData();
  if (!data.sessions) return null;
  
  const index = data.sessions.findIndex(s => s.id === id);
  if (index === -1) return null;
  
  data.sessions[index] = { ...data.sessions[index], ...updates, updatedAt: new Date().toISOString() };
  await saveOrdersData(data);
  return data.sessions[index];
}

