import { NextRequest, NextResponse } from 'next/server';
import { createPaymentSession, createOrder, getProductById, updateOrder } from '@/lib/payments/db';
import { createPaymentSession as createOPPSession } from '@/lib/payments/opp-client';
import type { CartItem } from '@/lib/payments/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, customerEmail, customerName } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items are required' },
        { status: 400 }
      );
    }

    // Validate and calculate total
    let total = 0;
    const validatedItems: CartItem[] = [];

    for (const item of items) {
      const product = await getProductById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      const quantity = item.quantity || 1;
      validatedItems.push({
        product,
        quantity,
      });
      total += product.price * quantity;
    }

    // Create order
    const orderId = uuidv4();
    const order = await createOrder({
      id: orderId,
      sessionId: '',
      products: validatedItems,
      total,
      currency: 'EUR',
      status: 'pending',
      customerEmail,
      customerName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create payment session with OPP
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const oppSession = await createOPPSession({
      amount: total,
      currency: 'EUR',
      description: `Order ${orderId} - ${validatedItems.length} item(s)`,
      returnUrl: `${baseUrl}/products/checkout/success?session_id={session_id}`,
      cancelUrl: `${baseUrl}/products/checkout/cancelled?session_id={session_id}`,
      metadata: {
        orderId,
      },
    });

    // Create local payment session
    const sessionId = oppSession.id || uuidv4();
    const session = await createPaymentSession({
      id: sessionId,
      orderId,
      amount: total,
      currency: 'EUR',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      products: validatedItems,
      customerEmail,
      customerName,
    });

    // Update order with session ID
    await updateOrder(orderId, { sessionId });

    return NextResponse.json({
      sessionId,
      checkoutUrl: oppSession.checkout_url || oppSession.url,
      orderId,
    });
  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment session' },
      { status: 500 }
    );
  }
}

