'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CreditCard, Smartphone, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const paymentMethods = [
  { 
    value: 'card', 
    label: 'Credit/Debit Card', 
    description: 'Visa, Mastercard, Amex',
    icon: CreditCard 
  },
  { 
    value: 'ideal', 
    label: 'iDEAL', 
    description: 'Dutch bank transfer',
    icon: Smartphone 
  },
  { 
    value: 'paypal', 
    label: 'PayPal', 
    description: 'Pay with your PayPal account',
    icon: Wallet 
  },
];

export function PaymentMethodSelector({ value, onValueChange }: PaymentMethodSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Payment Method</CardTitle>
        <CardDescription>Choose how you'd like to pay</CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={value} onValueChange={onValueChange} className="space-y-3">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = value === method.value;
            
            return (
              <Label
                key={method.value}
                htmlFor={method.value}
                className={cn(
                  "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-accent"
                )}
              >
                <RadioGroupItem value={method.value} id={method.value} />
                <Icon className={cn(
                  "h-5 w-5",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1">
                  <div className="font-medium">{method.label}</div>
                  <div className="text-sm text-muted-foreground">{method.description}</div>
                </div>
              </Label>
            );
          })}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}



