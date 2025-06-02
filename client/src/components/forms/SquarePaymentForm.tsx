/**
 * Square Payment Form Component
 * 
 * This component integrates Square's Web SDK to provide secure payment processing
 * for the Jesus Walks Napa Valley e-commerce platform. It handles credit card
 * tokenization and payment processing through Square's secure infrastructure.
 * 
 * Features:
 * - Secure credit card input fields (hosted by Square)
 * - Real-time payment validation
 * - Error handling and user feedback
 * - Integration with both sandbox and production Square environments
 * 
 * Props:
 * - amount: Payment amount in dollars
 * - onPaymentSuccess: Callback for successful payment
 * - onPaymentError: Callback for payment errors
 */

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

// Square Web SDK global interface declaration
// This allows TypeScript to recognize the Square object loaded from CDN
declare global {
  interface Window {
    Square: any;  // Square Web SDK object
  }
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SquarePaymentFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export function SquarePaymentForm({ amount, onPaymentSuccess, onPaymentError }: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [squareConfig, setSquareConfig] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load Square configuration
    const loadSquareConfig = async () => {
      try {
        const response = await apiRequest("GET", "/api/square-config");
        const config = await response.json();
        setSquareConfig(config);
      } catch (error) {
        console.error("Failed to load Square config:", error);
        onPaymentError("Failed to initialize Square payments");
      }
    };

    loadSquareConfig();
  }, [onPaymentError]);

  useEffect(() => {
    if (!squareConfig) return;

    // Load Square Web SDK - use production URL for production environment
    const script = document.createElement('script');
    const isProduction = squareConfig.environment === 'production';
    script.src = isProduction 
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = initializeSquare;
    document.head.appendChild(script);

    return () => {
      // Cleanup script when component unmounts
      const scriptUrl = isProduction 
        ? 'https://web.squarecdn.com/v1/square.js'
        : 'https://sandbox.web.squarecdn.com/v1/square.js';
      const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [squareConfig]);

  const initializeSquare = async () => {
    if (!window.Square || !squareConfig) return;

    try {
      const payments = window.Square.payments(squareConfig.applicationId, squareConfig.environment);

      // Initialize card payment method
      const card = await payments.card();
      await card.attach('#card-container');

      // Store payments instance for later use
      (window as any).squarePayments = payments;
      (window as any).squareCard = card;
    } catch (error) {
      console.error('Failed to initialize Square:', error);
      onPaymentError('Failed to initialize payment form');
    }
  };

  const handlePayment = async () => {
    if (!window.Square || !(window as any).squareCard) {
      onPaymentError('Payment system not ready');
      return;
    }

    setIsLoading(true);

    try {
      const result = await (window as any).squareCard.tokenize();

      if (result.status === 'OK') {
        // Token created successfully
        toast({
          title: "Payment Processed",
          description: `Square payment of $${amount.toFixed(2)} completed successfully!`,
        });

        onPaymentSuccess({
          token: result.token,
          amount: amount,
          processor: 'square'
        });
      } else {
        // Handle tokenization errors
        const errorMessage = result.errors?.[0]?.message || 'Payment failed';
        onPaymentError(errorMessage);
      }
    } catch (error) {
      console.error('Payment error:', error);
      onPaymentError('Payment processing failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!squareConfig) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
            <span className="ml-2">Loading Square payments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-sm"></div>
          </div>
          Pay with Square
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div id="card-container" className="min-h-[120px]">
            {/* Square card form will be injected here */}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total: ${amount.toFixed(2)}</span>
          <Button 
            onClick={handlePayment} 
            disabled={isLoading}
            className="bg-black hover:bg-gray-800 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Processing...
              </>
            ) : (
              `Pay $${amount.toFixed(2)} with Square`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Extend Window interface for Square
declare global {
  interface Window {
    Square: any;
  }
}