
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Smartphone } from 'lucide-react';

interface ApplePayFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export function ApplePayForm({ amount, onPaymentSuccess, onPaymentError }: ApplePayFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplePayAvailable, setIsApplePayAvailable] = useState(false);
  const [applePayConfig, setApplePayConfig] = useState<any>(null);
  const { toast } = useToast();

  // Check Apple Pay availability
  useEffect(() => {
    const checkApplePayAvailability = async () => {
      try {
        // Check if Apple Pay is available
        const isAvailable = window.ApplePaySession && 
          window.ApplePaySession.canMakePayments && 
          window.ApplePaySession.canMakePayments();
        
        setIsApplePayAvailable(isAvailable);

        if (isAvailable) {
          // Get Apple Pay configuration
          const response = await fetch('/api/apple-pay/config');
          const config = await response.json();
          setApplePayConfig(config);
        }
      } catch (error) {
        console.error('Apple Pay availability check failed:', error);
        setIsApplePayAvailable(false);
      }
    };

    checkApplePayAvailability();
  }, []);

  const handleApplePayPayment = async () => {
    if (!isApplePayAvailable || !applePayConfig) {
      onPaymentError('Apple Pay is not available on this device');
      return;
    }

    setIsProcessing(true);

    try {
      // Create Apple Pay payment request
      const paymentRequest = {
        countryCode: applePayConfig.countryCode,
        currencyCode: 'USD',
        supportedNetworks: applePayConfig.supportedNetworks,
        merchantCapabilities: ['supports3DS', 'supportsEMV', 'supportsCredit', 'supportsDebit'],
        total: {
          label: applePayConfig.merchantName,
          amount: amount.toString(),
          type: 'final'
        },
        lineItems: [
          {
            label: 'Jesus Walks Napa Valley Purchase',
            amount: amount.toString(),
            type: 'final'
          }
        ]
      };

      // Start Apple Pay session
      const session = new window.ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event: any) => {
        try {
          // In production, validate with your server
          const response = await fetch('/api/apple-pay/validate-merchant', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              validationURL: event.validationURL,
              domainName: window.location.hostname
            })
          });

          const merchantSession = await response.json();
          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          console.error('Apple Pay merchant validation failed:', error);
          session.abort();
        }
      };

      session.onpaymentauthorized = async (event: any) => {
        try {
          // Process payment with your server
          const response = await fetch('/api/apple-pay/process-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount,
              currency: 'USD',
              description: 'Jesus Walks Napa Valley Purchase',
              merchantReference: `ORDER-${Date.now()}`,
              paymentToken: event.payment.token
            })
          });

          const result = await response.json();

          if (result.success) {
            session.completePayment(window.ApplePaySession.STATUS_SUCCESS);
            onPaymentSuccess(result);
            toast({
              title: "Payment Successful",
              description: "Your Apple Pay payment has been processed successfully!",
            });
          } else {
            session.completePayment(window.ApplePaySession.STATUS_FAILURE);
            onPaymentError(result.error || 'Apple Pay payment failed');
          }
        } catch (error: any) {
          session.completePayment(window.ApplePaySession.STATUS_FAILURE);
          onPaymentError(error.message || 'Apple Pay payment failed');
        }
      };

      session.oncancel = () => {
        setIsProcessing(false);
        onPaymentError('Apple Pay payment was cancelled');
      };

      session.begin();

    } catch (error: any) {
      console.error('Apple Pay error:', error);
      onPaymentError(error.message || 'Apple Pay payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isApplePayAvailable) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Apple Pay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Apple Pay is not available on this device</p>
            <p className="text-sm mt-1">Use Safari on an iOS device or Mac with Touch ID</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Apple Pay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pay securely with Touch ID or Face ID
          </p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total: ${amount.toFixed(2)}</span>
          <Button 
            onClick={handleApplePayPayment}
            disabled={isProcessing}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                Pay with Apple Pay
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Extend Window interface for Apple Pay
declare global {
  interface Window {
    ApplePaySession: any;
  }
}
