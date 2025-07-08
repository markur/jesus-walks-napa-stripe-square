
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Smartphone } from 'lucide-react';

interface GooglePayFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export function GooglePayForm({ amount, onPaymentSuccess, onPaymentError }: GooglePayFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGooglePayAvailable, setIsGooglePayAvailable] = useState(false);
  const [googlePayConfig, setGooglePayConfig] = useState<any>(null);
  const [paymentsClient, setPaymentsClient] = useState<any>(null);
  const { toast } = useToast();

  // Check Google Pay availability
  useEffect(() => {
    const checkGooglePayAvailability = async () => {
      try {
        // Load Google Pay API
        if (!window.google) {
          await loadGooglePayScript();
        }

        // Get Google Pay configuration
        const response = await fetch('/api/google-pay/config');
        const config = await response.json();
        setGooglePayConfig(config);

        // Initialize payments client
        const client = new window.google.payments.api.PaymentsClient({
          environment: config.environment
        });
        setPaymentsClient(client);

        // Check if Google Pay is available
        const isReadyToPayRequest = {
          apiVersion: 2,
          apiVersionMinor: 0,
          allowedPaymentMethods: [
            {
              type: 'CARD',
              parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: config.supportedNetworks
              }
            }
          ]
        };

        const isReadyToPay = await client.isReadyToPay(isReadyToPayRequest);
        setIsGooglePayAvailable(isReadyToPay.result);

      } catch (error) {
        console.error('Google Pay availability check failed:', error);
        setIsGooglePayAvailable(false);
      }
    };

    checkGooglePayAvailability();
  }, []);

  const loadGooglePayScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://pay.google.com/gp/p/js/pay.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Pay script'));
      document.head.appendChild(script);
    });
  };

  const handleGooglePayPayment = async () => {
    if (!isGooglePayAvailable || !googlePayConfig || !paymentsClient) {
      onPaymentError('Google Pay is not available');
      return;
    }

    setIsProcessing(true);

    try {
      // Create payment data request
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
            type: 'CARD',
            parameters: {
              allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
              allowedCardNetworks: googlePayConfig.supportedNetworks
            },
            tokenizationSpecification: {
              type: 'PAYMENT_GATEWAY',
              parameters: {
                gateway: 'stripe',
                'stripe:version': '2023-10-16',
                'stripe:publishableKey': process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || ''
              }
            }
          }
        ],
        merchantInfo: {
          merchantId: googlePayConfig.merchantId,
          merchantName: googlePayConfig.merchantName
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: amount.toString(),
          currencyCode: 'USD'
        }
      };

      // Request payment data
      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

      // Process payment with your server
      const response = await fetch('/api/google-pay/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'USD',
          description: 'Jesus Walks Napa Valley Purchase',
          merchantReference: `ORDER-${Date.now()}`,
          paymentToken: paymentData.paymentMethodData.tokenizationData.token
        })
      });

      const result = await response.json();

      if (result.success) {
        onPaymentSuccess(result);
        toast({
          title: "Payment Successful",
          description: "Your Google Pay payment has been processed successfully!",
        });
      } else {
        onPaymentError(result.error || 'Google Pay payment failed');
      }

    } catch (error: any) {
      console.error('Google Pay error:', error);
      onPaymentError(error.message || 'Google Pay payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isGooglePayAvailable) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Google Pay
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Google Pay is not available</p>
            <p className="text-sm mt-1">Use a supported browser with Google Pay enabled</p>
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
          Google Pay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pay securely with Google Pay
          </p>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total: ${amount.toFixed(2)}</span>
          <Button 
            onClick={handleGooglePayPayment}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Smartphone className="h-4 w-4 mr-2" />
                Pay with Google Pay
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Extend Window interface for Google Pay
declare global {
  interface Window {
    google: any;
  }
}
