
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Smartphone, Shield, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SafeKeyPaymentFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export function SafeKeyPaymentForm({ amount, onPaymentSuccess, onPaymentError }: SafeKeyPaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [mobileNumber, setMobileNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const { toast } = useToast();

  const handleSafeKeyPayment = async () => {
    if (!mobileNumber || !cardNumber) {
      onPaymentError('Please provide both mobile number and card number');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('pending');
    onPaymentError('');

    try {
      // Step 1: Initiate SafeKey payment
      const response = await apiRequest("POST", "/api/safekey/process-payment", {
        amount,
        currency: 'USD',
        mobileNumber,
        cardNumber: cardNumber.replace(/\s/g, ''), // Remove spaces
        merchantReference: `ORDER-${Date.now()}`
      });

      const result = await response.json();

      if (result.success) {
        // Step 2: Wait for mobile authorization
        toast({
          title: "Authorization Required",
          description: "Please approve the payment on your mobile device",
        });

        // Simulate mobile authorization process
        setTimeout(() => {
          setPaymentStatus('success');
          onPaymentSuccess({
            paymentId: result.paymentId,
            authReference: result.authReference,
            amount,
            method: 'safekey'
          });
        }, 4000); // 4 second simulation

      } else {
        setPaymentStatus('error');
        onPaymentError(result.error || 'SafeKey payment failed');
      }
    } catch (error: any) {
      setPaymentStatus('error');
      onPaymentError(error.message || 'SafeKey payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatMobileNumber = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\D/g, '');
    // Format as +1 (XXX) XXX-XXXX
    if (v.length >= 10) {
      return `+1 (${v.slice(0, 3)}) ${v.slice(3, 6)}-${v.slice(6, 10)}`;
    }
    return `+1 ${v}`;
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-900">SafeKey Secure Payment</span>
        </div>
        <p className="text-sm text-blue-800">
          Your payment will be authorized through your mobile banking app for enhanced security.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input
            id="mobile"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(formatMobileNumber(e.target.value))}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Number registered with your bank for SafeKey
          </p>
        </div>

        <div>
          <Label htmlFor="card">Card Number</Label>
          <Input
            id="card"
            type="text"
            placeholder="1234 5678 9012 3456"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Last 4 digits will be used for verification
          </p>
        </div>
      </div>

      {paymentStatus === 'pending' && (
        <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="animate-bounce">
              <Smartphone className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">Waiting for authorization...</p>
              <p className="text-sm text-amber-700">
                Check your mobile banking app and approve the payment
              </p>
            </div>
          </div>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span>Payment authorized successfully!</span>
        </div>
      )}

      <Button 
        onClick={handleSafeKeyPayment}
        disabled={isProcessing || !mobileNumber || !cardNumber || paymentStatus === 'success'}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {paymentStatus === 'pending' ? 'Awaiting Authorization...' : 'Processing...'}
          </>
        ) : (
          `Pay $${amount.toFixed(2)} with SafeKey`
        )}
      </Button>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• SecureCode verification via mobile app</p>
        <p>• No card details stored on our servers</p>
        <p>• Protected by bank-grade security</p>
      </div>
    </div>
  );
}
