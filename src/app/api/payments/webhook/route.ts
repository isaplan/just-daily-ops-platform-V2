import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentSession, updateOrder, getPaymentSessionById } from '@/lib/payments/db';
import { verifyWebhookSignature } from '@/lib/payments/opp-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-opp-signature') || '';

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const payload = JSON.parse(body);
    const { payment_id, status, order_id } = payload;

    // Update payment session
    const session = await getPaymentSessionById(payment_id);
    if (session) {
      await updatePaymentSession(payment_id, {
        status: status === 'paid' ? 'completed' : status === 'failed' ? 'failed' : 'pending',
        paymentMethod: payload.payment_method,
      });

      // Update order
      if (session.orderId) {
        await updateOrder(session.orderId, {
          status: status === 'paid' ? 'completed' : status === 'failed' ? 'failed' : 'pending',
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}



