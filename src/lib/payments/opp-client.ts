import type { OPPPaymentRequest } from './types';
import { v4 as uuidv4 } from 'uuid';

const OPP_API_URL = process.env.ONLINE_PAYMENT_PLATFORM_API_URL || 'https://api.onlinepaymentplatform.com';
const OPP_API_KEY = process.env.ONLINE_PAYMENT_PLATFORM_API_KEY || '';
const OPP_SECRET_KEY = process.env.ONLINE_PAYMENT_PLATFORM_SECRET_KEY || '';
const OPP_TEST_MODE = process.env.ONLINE_PAYMENT_PLATFORM_TEST_MODE === 'true' || !OPP_API_KEY;

// Test mode: Simulate API responses without making real API calls
const TEST_MODE = OPP_TEST_MODE;

export async function createPaymentSession(request: OPPPaymentRequest) {
  // Test mode: Return mock response
  if (TEST_MODE) {
    console.log('[OPP TEST MODE] Creating mock payment session:', request);
    const sessionId = `test_session_${uuidv4()}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // For embedded checkout, create a test checkout page that can be displayed in iframe
    // For hosted checkout redirect, use success page
    const testCheckoutUrl = `${baseUrl}/products/checkout/test-checkout?session_id=${sessionId}&amount=${request.amount}`;
    
    return {
      id: sessionId,
      checkout_url: testCheckoutUrl,
      url: testCheckoutUrl,
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
    };
  }

  // Production mode: Make real API call
  try {
    const response = await fetch(`${OPP_API_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPP_API_KEY}`,
        'X-API-Secret': OPP_SECRET_KEY,
      },
      body: JSON.stringify({
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
        metadata: request.metadata || {},
        // OPP specific options
        payment_methods: ['card', 'ideal', 'paypal'], // Supported payment methods
        locale: 'en', // or 'nl' for Dutch
        // Enable embedded checkout if supported
        embedded: false, // Set to true if you want embedded checkout
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OPP API error: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment session:', error);
    throw error;
  }
}

export async function getPaymentStatus(paymentId: string) {
  // Test mode: Return mock response
  if (TEST_MODE) {
    console.log('[OPP TEST MODE] Getting mock payment status:', paymentId);
    return {
      id: paymentId,
      status: 'completed',
      amount: 0,
      currency: 'EUR',
    };
  }

  // Production mode: Make real API call
  try {
    const response = await fetch(`${OPP_API_URL}/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPP_API_KEY}`,
        'X-API-Secret': OPP_SECRET_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment status: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting payment status:', error);
    throw error;
  }
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  // Implement webhook signature verification based on OPP documentation
  // This is a placeholder - check OPP docs for actual implementation
  const webhookSecret = process.env.ONLINE_PAYMENT_PLATFORM_WEBHOOK_SECRET || '';
  // Add actual signature verification logic here
  return true; // Placeholder
}

