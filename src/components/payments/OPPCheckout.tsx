'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface OPPCheckoutProps {
  checkoutUrl: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * OPP Hosted Checkout Component
 * Embeds OPP's hosted checkout page in an iframe
 * Falls back to redirect if iframe fails
 */
export function OPPCheckout({ checkoutUrl, onSuccess, onError }: OPPCheckoutProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for messages from OPP checkout (if they support postMessage)
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (!event.origin.includes('onlinepaymentplatform.com')) {
        return;
      }

      if (event.data.type === 'payment_success') {
        setIsLoading(false);
        onSuccess?.();
      } else if (event.data.type === 'payment_error') {
        setIsLoading(false);
        const errorMsg = event.data.message || 'Payment failed';
        setError(errorMsg);
        onError?.(errorMsg);
      } else if (event.data.type === 'payment_cancelled') {
        setIsLoading(false);
        onError?.('Payment was cancelled');
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if iframe loaded successfully
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.onload = () => {
        setIsLoading(false);
      };
      iframe.onerror = () => {
        setIsLoading(false);
        setError('Failed to load checkout page');
        onError?.('Failed to load checkout page');
      };
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [checkoutUrl, onSuccess, onError]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            You can also{' '}
            <a 
              href={checkoutUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              open checkout in a new window
            </a>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Payment</CardTitle>
        <CardDescription>
          Secure payment powered by Online Payment Platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full border-2 border-border rounded-lg overflow-hidden bg-muted" style={{ minHeight: '600px' }}>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <span className="text-muted-foreground">Loading checkout...</span>
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={checkoutUrl}
            className="w-full h-full border-0"
            style={{ 
              minHeight: '600px',
              display: isLoading ? 'none' : 'block',
              width: '100%',
            }}
            title="OPP Checkout"
            allow="payment *"
            sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            onLoad={() => setIsLoading(false)}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Your payment is processed securely by Online Payment Platform
        </p>
      </CardContent>
    </Card>
  );
}

