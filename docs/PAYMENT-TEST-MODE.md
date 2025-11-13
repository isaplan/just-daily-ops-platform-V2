# Payment System Test Mode

## Test Mode Configuration

The payment system includes a **test mode** that allows you to test the checkout flow without real API credentials or actual payment processing.

### How to Enable Test Mode

Test mode is automatically enabled when:
1. No `ONLINE_PAYMENT_PLATFORM_API_KEY` is set in environment variables, OR
2. `ONLINE_PAYMENT_PLATFORM_TEST_MODE=true` is explicitly set

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Test Mode (automatic if API_KEY is not set)
ONLINE_PAYMENT_PLATFORM_TEST_MODE=true

# OR use real credentials for production
ONLINE_PAYMENT_PLATFORM_API_KEY=your_api_key_here
ONLINE_PAYMENT_PLATFORM_SECRET_KEY=your_secret_key_here
ONLINE_PAYMENT_PLATFORM_WEBHOOK_SECRET=your_webhook_secret_here
ONLINE_PAYMENT_PLATFORM_API_URL=https://api.onlinepaymentplatform.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Test Mode Behavior

In test mode:
- ✅ Payment sessions are created instantly (no API calls)
- ✅ All payments redirect to success page automatically
- ✅ No real charges are made
- ✅ All payment data is stored locally in `data/orders.json`
- ✅ Console logs show `[OPP TEST MODE]` prefix for debugging

### Testing the Checkout Flow

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Visit the products page:**
   ```
   http://localhost:3000/products
   ```

3. **Add products to cart** and proceed to checkout

4. **Complete the checkout form:**
   - Fill in customer name and email
   - Select payment method
   - Click "Proceed to Payment"

5. **In test mode**, you'll be redirected directly to the success page

### Getting Real Test Credentials

To get actual test credentials from Online Payment Platform:

1. Visit their developer portal: https://docs.onlinepaymentplatform.com
2. Sign up for a developer account
3. Access the test/sandbox environment
4. Generate test API keys from the dashboard
5. Update your `.env.local` with the test credentials

### Switching to Production

When ready for production:

1. Remove `ONLINE_PAYMENT_PLATFORM_TEST_MODE=true` from `.env.local`
2. Add your production API credentials:
   ```env
   ONLINE_PAYMENT_PLATFORM_API_KEY=prod_api_key
   ONLINE_PAYMENT_PLATFORM_SECRET_KEY=prod_secret_key
   ONLINE_PAYMENT_PLATFORM_WEBHOOK_SECRET=prod_webhook_secret
   ```
3. Update `ONLINE_PAYMENT_PLATFORM_API_URL` to production URL if different
4. Restart your development server

### Local Database

All orders and payment sessions are stored in:
- `data/orders.json` - Contains orders and payment sessions
- `data/products.json` - Product catalog

You can manually edit these files to test different scenarios.



