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

import React, { useEffect, useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Square: any;
  }
}

interface SquarePaymentFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

export function SquarePaymentForm({ amount, onPaymentSuccess, onPaymentError }: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [squareConfig, setSquareConfig] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const cardRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);
  const containerIdRef = useRef<string>(`square-card-${Date.now()}`);

  // Simple cleanup and re-initialization on amount change
  useEffect(() => {
    if (squareConfig && window.Square && isInitialized) {
      cleanupAndReinitialize();
    }
  }, [amount]);

  useEffect(() => {
    loadSquareConfig();
  }, []);

  useEffect(() => {
    if (squareConfig && !isInitialized) {
      initializeSquare();
    }
  }, [squareConfig]);

  const loadSquareConfig = async () => {
    try {
      const response = await fetch("/api/square-config");
      if (!response.ok) {
        throw new Error(`Failed to load Square config: ${response.status}`);
      }
      const config = await response.json();
      setSquareConfig(config);
    } catch (error) {
      console.error("Square config error:", error);
      onPaymentError("Failed to load payment configuration");
    }
  };

  const cleanupAndReinitialize = async () => {
    // Clean up existing instance
    if (cardRef.current) {
      try {
        await cardRef.current.destroy();
      } catch (e) {
        console.warn("Card cleanup warning:", e);
      }
      cardRef.current = null;
    }

    // Generate new container ID to force fresh state
    containerIdRef.current = `square-card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Clear and recreate container
    const wrapper = document.getElementById('square-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `<div id="${containerIdRef.current}"></div>`;
    }

    // Small delay then reinitialize
    setTimeout(() => {
      createSquareCard();
    }, 100);
  };

  const initializeSquare = async () => {
    if (window.Square) {
      createSquareCard();
      return;
    }

    // Load Square SDK
    const script = document.createElement('script');
    const isProduction = squareConfig?.environment === 'production';
    script.src = isProduction 
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.onload = createSquareCard;
    script.onerror = () => onPaymentError('Failed to load Square SDK');
    document.head.appendChild(script);
  };

  const createSquareCard = async () => {
    if (!window.Square || !squareConfig) return;

    try {
      // Create payments instance (reuse if available)
      if (!paymentsRef.current) {
        paymentsRef.current = window.Square.payments(squareConfig.applicationId, squareConfig.locationId);
      }

      // Create card with simple configuration
      const card = await paymentsRef.current.card({
        style: {
          input: {
            fontSize: '16px',
            fontFamily: 'system-ui, sans-serif'
          }
        }
      });

      // Attach to container
      await card.attach(`#${containerIdRef.current}`);
      cardRef.current = card;
      setIsInitialized(true);

    } catch (error) {
      console.error('Square initialization error:', error);
      onPaymentError(`Payment form error: ${error.message}`);
    }
  };

  const refreshCard = () => {
    cleanupAndReinitialize();
  };

  const handlePayment = async () => {
    if (!cardRef.current) {
      onPaymentError('Payment form not ready');
      return;
    }

    setIsLoading(true);

    try {
      const result = await cardRef.current.tokenize();

      if (result.status === 'OK') {
        const paymentResult = {
          token: result.token,
          amount: amount,
          timestamp: new Date().toISOString(),
          method: 'square'
        };

        onPaymentSuccess(paymentResult);
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Payment validation failed';
        onPaymentError(errorMessage);
      }
    } catch (error: any) {
      onPaymentError(error.message || 'Payment processing failed');
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
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="text-sm text-gray-600 mb-3">
            <strong>Test Card Information:</strong>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Card Number:</span>
              <span className="font-mono">4111 1111 1111 1111</span>
            </div>
            <div className="flex justify-between">
              <span>Expiry:</span>
              <span>12/25</span>
            </div>
            <div className="flex justify-between">
              <span>CVV:</span>
              <span>123</span>
            </div>
          </div>
        </div>

        {/* Square Card Container */}
        <div id="square-wrapper">
          <div id={containerIdRef.current} className="p-4 border rounded-lg min-h-[60px] bg-white">
            {!isInitialized && (
              <div className="text-gray-500 text-center">Loading payment form...</div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total: ${amount.toFixed(2)}</span>
          <div className="flex gap-2">
            <Button 
              onClick={refreshCard}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={isLoading || !isInitialized}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                `Pay $${amount.toFixed(2)}`
              )}
            </Button>
          </div>
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