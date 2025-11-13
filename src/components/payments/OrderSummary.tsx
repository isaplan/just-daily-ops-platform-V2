'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CartItem } from '@/lib/payments/types';
import { Trash2 } from 'lucide-react';

interface OrderSummaryProps {
  items: CartItem[];
  onRemoveItem: (productId: string) => void;
}

export function OrderSummary({ items, onRemoveItem }: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const tax = subtotal * 0.21; // 21% VAT
  const total = subtotal + tax;

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">Your cart is empty</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
        <CardDescription>{items.length} item{items.length !== 1 ? 's' : ''} in your cart</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.map((item) => (
            <div 
              key={item.product.id} 
              className="flex justify-between items-start gap-4 pb-3 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.product.name}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <span>{item.product.currency} {item.product.price.toFixed(2)}</span>
                  <span>×</span>
                  <Badge variant="secondary">{item.quantity}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-medium">
                    {item.product.currency} {(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.product.id)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">EUR {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">VAT (21%)</span>
            <span className="font-medium">EUR {tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold pt-2">
            <span>Total</span>
            <span>EUR {total.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}



