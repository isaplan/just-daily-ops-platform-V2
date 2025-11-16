/**
 * ⚠️  MIGRATED TO ARCHIVE - DO NOT USE DIRECTLY
 * Migrated: 2025-11-13 01:18:49
 * Original: /Users/alviniomolina/Documents/GitHub/just-daily-ops-platform/src/app/(dashboard)/checkout
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutForm } from '@/components/payments/CheckoutForm';
import type { CartItem } from '@/lib/payments/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      router.push('/products');
    }
  }, [router]);

  const handleRemoveItem = (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    if (newCart.length === 0) {
      localStorage.removeItem('cart');
      router.push('/products');
    } else {
      localStorage.setItem('cart', JSON.stringify(newCart));
      setCart(newCart);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Your cart is empty</p>
          <Button onClick={() => router.push('/products')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => router.push('/products')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Products
      </Button>

      <h1 className="text-3xl font-bold mb-6">Checkout</h1>

      <CheckoutForm items={cart} onRemoveItem={handleRemoveItem} />
    </div>
  );
}



