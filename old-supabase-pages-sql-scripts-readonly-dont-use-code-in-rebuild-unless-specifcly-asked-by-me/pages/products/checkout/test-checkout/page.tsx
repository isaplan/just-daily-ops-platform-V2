/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/products
 */

'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';

/**
 * Test Checkout Page for Embedded Iframe
 * This simulates OPP's checkout page for testing embedded checkout
 */
export default function TestCheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') || '';
  const amount = searchParams.get('amount') || '0';
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      // Send success message to parent window (if in iframe)
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'payment_success',
          sessionId,
          amount: parseFloat(amount),
        }, '*');
      } else {
        // If not in iframe, redirect directly
        const baseUrl = window.location.origin;
        window.location.href = `${baseUrl}/products/checkout/success?session_id=${sessionId}`;
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-blue-100 p-3">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle>Test Payment Checkout</CardTitle>
            <CardDescription>
              This is a test checkout page (simulating OPP checkout)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-xl font-bold">EUR {parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Session ID</span>
                <span className="text-xs font-mono">{sessionId.slice(0, 8)}...</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  maxLength={19}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                  <Input
                    id="expiry"
                    placeholder="12/25"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    maxLength={5}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Pay EUR {parseFloat(amount).toFixed(2)}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (window.parent !== window) {
                      window.parent.postMessage({
                        type: 'payment_cancelled',
                        sessionId,
                      }, '*');
                    } else {
                      const baseUrl = window.location.origin;
                      window.location.href = `${baseUrl}/products/checkout/cancelled?session_id=${sessionId}`;
                    }
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </form>

            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Test Mode:</strong> This is a simulated checkout page. 
                No real payment will be processed. In production, this would be OPP's actual checkout page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



