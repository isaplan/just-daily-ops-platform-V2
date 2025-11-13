'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/payments/types';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <Badge variant="outline">{product.category}</Badge>
        </div>
        <CardDescription className="line-clamp-2">{product.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="aspect-video bg-muted rounded-md mb-4 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Product Image</span>
        </div>
        <div className="mt-auto">
          <div className="text-2xl font-bold mb-2">
            {product.currency} {product.price.toFixed(2)}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => onAddToCart(product)} 
          className="w-full"
          size="lg"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}



