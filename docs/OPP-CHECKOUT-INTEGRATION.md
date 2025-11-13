# Online Payment Platform (OPP) Checkout Integration

## Overview

This project integrates with Online Payment Platform's hosted checkout solution. The checkout flow supports both:

1. **Hosted Checkout (Default)** - Redirects to OPP's secure payment page
2. **Embedded Checkout** - Embeds OPP's checkout in an iframe (optional)

## How It Works

### Default Flow (Hosted Checkout)

1. Customer adds products to cart on `/products`
2. Customer proceeds to `/checkout` and fills in details
3. System creates payment session via `/api/payments/create-session`
4. Customer is redirected to OPP's hosted checkout page
5. After payment, customer is redirected back to:
   - `/checkout/success` - Payment successful
   - `/checkout/cancelled` - Payment cancelled

### Embedded Checkout (Alternative)

To use embedded checkout instead:

1. Update `src/components/payments/CheckoutForm.tsx`:
   ```typescript
   // Change from:
   window.location.href = data.checkoutUrl;
   
   // To:
   router.push(`/checkout/opp?session_id=${data.sessionId}`);
   ```

2. The embedded checkout page (`/checkout/opp`) will display OPP's checkout in an iframe

## API Configuration

### Environment Variables

```env
# OPP API Credentials
ONLINE_PAYMENT_PLATFORM_API_KEY=your_api_key
ONLINE_PAYMENT_PLATFORM_SECRET_KEY=your_secret_key
ONLINE_PAYMENT_PLATFORM_WEBHOOK_SECRET=your_webhook_secret
ONLINE_PAYMENT_PLATFORM_API_URL=https://api.onlinepaymentplatform.com

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test Mode (optional - auto-enabled if no API key)
ONLINE_PAYMENT_PLATFORM_TEST_MODE=true
```

### Payment Session Creation

The system creates payment sessions with the following OPP options:

```typescript
{
  amount: number,
  currency: 'EUR',
  description: string,
  return_url: string,  // Success redirect
  cancel_url: string, // Cancel redirect
  metadata: { orderId: string },
  payment_methods: ['card', 'ideal', 'paypal'],
  locale: 'en', // or 'nl'
  embedded: false // Set to true for embedded checkout
}
```

## Supported Payment Methods

- **Card** - Credit/Debit cards (Visa, Mastercard, Amex)
- **iDEAL** - Dutch bank transfer
- **PayPal** - PayPal payments

## Webhook Integration

Webhooks are handled at `/api/payments/webhook`. The webhook:

1. Verifies the signature from OPP
2. Updates payment session status
3. Updates order status
4. Handles payment completion/failure

### Webhook Events

- `payment_success` - Payment completed
- `payment_failed` - Payment failed
- `payment_cancelled` - Payment cancelled

## Test Mode

When `ONLINE_PAYMENT_PLATFORM_TEST_MODE=true` or no API key is set:

- All payments redirect directly to success page
- No real API calls are made
- Perfect for development and testing

## Production Setup

1. **Get OPP Credentials**
   - Sign up at https://onlinepaymentplatform.com
   - Get your API keys from the dashboard
   - Configure webhook URL: `https://yourdomain.com/api/payments/webhook`

2. **Update Environment Variables**
   ```env
   ONLINE_PAYMENT_PLATFORM_API_KEY=prod_api_key
   ONLINE_PAYMENT_PLATFORM_SECRET_KEY=prod_secret_key
   ONLINE_PAYMENT_PLATFORM_WEBHOOK_SECRET=prod_webhook_secret
   ONLINE_PAYMENT_PLATFORM_TEST_MODE=false
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```

3. **Test the Integration**
   - Make a test purchase
   - Verify webhook receives events
   - Check order status updates

## Customization

### Change Payment Methods

Edit `src/lib/payments/opp-client.ts`:

```typescript
payment_methods: ['card', 'ideal', 'paypal', 'bancontact', 'sofort']
```

### Change Locale

```typescript
locale: 'nl' // For Dutch
locale: 'en' // For English
```

### Enable Embedded Checkout

1. Set `embedded: true` in `opp-client.ts`
2. Update checkout form to use `/checkout/opp` route
3. Ensure your domain allows iframes (CSP headers)

## Troubleshooting

### Checkout URL Not Loading

- Verify API credentials are correct
- Check network tab for API errors
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly

### Webhooks Not Working

- Verify webhook URL is accessible
- Check webhook secret matches
- Review server logs for webhook errors

### Payment Status Not Updating

- Check webhook is receiving events
- Verify database updates are working
- Review order status in `data/orders.json`

## Support

For OPP-specific issues:
- Documentation: https://docs.onlinepaymentplatform.com
- Support: Contact OPP support team

For integration issues:
- Check server logs
- Review API responses
- Test in test mode first



