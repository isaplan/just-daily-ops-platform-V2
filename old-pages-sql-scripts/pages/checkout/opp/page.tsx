/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/checkout
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OPPCheckout } from '@/components/payments/OPPCheckout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function OPPCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // If we have a session ID, get the checkout URL
      fetchCheckoutUrl(sessionId);
    } else {
      // Otherwise, create a new session from cart
      createCheckoutSession();
    }
  }, [sessionId]);

  const createCheckoutSession = async () => {
    try {
      const cart = localStorage.getItem('cart');
      if (!cart) {
        toast.error('Your cart is empty');
        router.push('/products');
        return;
      }

      const items = JSON.parse(cart);
      if (items.length === 0) {
        toast.error('Your cart is empty');
        router.push('/products');
        return;
      }

      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item: any) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      if (data.checkoutUrl) {
        setCheckoutUrl(data.checkoutUrl);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCheckoutUrl = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/payments/status?session_id=${sessionId}`);
      const data = await response.json();

      if (data.session && data.session.checkoutUrl) {
        setCheckoutUrl(data.session.checkoutUrl);
      } else {
        throw new Error('Checkout URL not found');
      }
    } catch (error) {
      console.error('Error fetching checkout URL:', error);
      toast.error('Failed to load checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    // Clear cart
    localStorage.removeItem('cart');
    // Redirect to success page
    router.push(`/checkout/success?session_id=${sessionId || ''}`);
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">Preparing checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!checkoutUrl) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Failed to load checkout</p>
            <Button onClick={() => router.push('/products')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/checkout')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Checkout
      </Button>

      {/* Option to open in new window */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">OPP Hosted Checkout</p>
              <p className="text-sm text-muted-foreground">
                Complete your payment securely on OPP's platform
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Window
            </Button>
          </div>
        </CardContent>
      </Card>

      <OPPCheckout 
        checkoutUrl={checkoutUrl}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

