export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PaymentSession {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
  products: CartItem[];
  customerEmail?: string;
  customerName?: string;
}

export interface Order {
  id: string;
  sessionId: string;
  products: CartItem[];
  total: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  customerEmail?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OPPPaymentRequest {
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}



