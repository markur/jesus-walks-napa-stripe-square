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
  const cardRef = useRef<any>(null);
  const paymentsRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    loadSquareConfig();
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (squareConfig && !isInitialized && mountedRef.current) {
      initializeSquare();
    }
  }, [squareConfig]);

  const cleanup = () => {
    if (cardRef.current) {
      try {
        cardRef.current.destroy();
      } catch (e) {
        console.warn("Card cleanup:", e);
      }
      cardRef.current = null;
    }
    paymentsRef.current = null;
  };

  const loadSquareConfig = async () => {
    try {
      const response = await fetch("/api/square-config");
      if (!response.ok) {
        throw new Error(`Failed to load Square config: ${response.status}`);
      }
      const config = await response.json();
      if (mountedRef.current) {
        setSquareConfig(config);
      }
    } catch (error) {
      console.error("Square config error:", error);
      if (mountedRef.current) {
        onPaymentError("Failed to load payment configuration");
      }
    }
  };

  const initializeSquare = async () => {
    try {
      // Check if Square is already loaded
      if (window.Square) {
        console.log('Square SDK already loaded, creating card...');
        await createSquareCard();
        return;
      }

      console.log('Loading Square SDK...');
      
      // Remove any existing Square scripts
      const existingScripts = document.querySelectorAll('script[src*="square"]');
      existingScripts.forEach(script => script.remove());

      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load Square SDK with a promise wrapper for better error handling
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // Always use sandbox for development
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
        script.async = true;
        
        script.onload = () => {
          console.log('Square SDK loaded successfully from sandbox');
          // Give Square SDK a moment to initialize
          setTimeout(() => resolve(true), 500);
        };
        
        script.onerror = (error) => {
          console.error('Square SDK failed to load:', error);
          reject(new Error('Failed to load Square SDK'));
        };
        
        document.head.appendChild(script);
        
        // Timeout after 15 seconds (increased timeout)
        setTimeout(() => reject(new Error('Square SDK load timeout')), 15000);
      });

      if (mountedRef.current && window.Square) {
        console.log('Square SDK ready, creating card...');
        await createSquareCard();
      } else {
        throw new Error('Square SDK not available after loading');
      }
    } catch (error) {
      console.error('Square initialization error:', error);
      if (mountedRef.current) {
        onPaymentError(`Failed to initialize Square: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const createSquareCard = async () => {
    if (!window.Square || !squareConfig || !mountedRef.current) {
      console.warn('Cannot create Square card - missing dependencies');
      return;
    }

    try {
      console.log('Creating Square card with config:', squareConfig);
      
      cleanup(); // Clean up any existing instances

      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify container exists
      const container = document.getElementById('square-card-container');
      if (!container) {
        throw new Error('Square card container not found');
      }

      // Create fresh payments instance
      paymentsRef.current = window.Square.payments(
        squareConfig.applicationId, 
        squareConfig.locationId
      );

      console.log('Square payments instance created');

      // Create card with proper configuration for better UX
      const card = await paymentsRef.current.card({
        style: {
          input: {
            fontSize: '16px',
            padding: '12px',
            color: '#000000',
            backgroundColor: '#ffffff'
          },
          '.input-container': {
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#d1d5db',
            borderRadius: '6px'
          },
          '.input-container.is-focus': {
            borderColor: '#3b82f6',
            borderWidth: '2px'
          },
          '.input-container.is-error': {
            borderColor: '#ef4444'
          }
        },
        includeInputLabels: true
      });

      console.log('Square card created, attaching to container');

      // Attach to container
      await card.attach('#square-card-container');
      
      console.log('Square card attached successfully');
      
      if (mountedRef.current) {
        cardRef.current = card;
        setIsInitialized(true);
      }

    } catch (error) {
      console.error('Square card creation error:', error);
      if (mountedRef.current) {
        onPaymentError(`Payment form initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handlePayment = async () => {
    if (!cardRef.current || !mountedRef.current) {
      onPaymentError('Payment form not ready');
      return;
    }

    setIsLoading(true);

    try {
      const result = await cardRef.current.tokenize();

      if (!mountedRef.current) return;

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
    } catch (error) {
      if (mountedRef.current) {
        onPaymentError(error instanceof Error ? error.message : 'Payment processing failed');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
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
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
            <div className="text-sm text-blue-800 mb-2">
              <strong>Development Mode - Test Card:</strong>
            </div>
            <div className="text-xs text-blue-600">
              Use: 4111 1111 1111 1111, Exp: 12/25, CVV: 123
            </div>
          </div>
        )}

        {/* Square Card Container - Fixed ID */}
        <div 
          id="square-card-container" 
          className="p-4 border rounded-lg min-h-[120px] bg-white"
          style={{ minHeight: '120px' }}
        >
          {!isInitialized && squareConfig && (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
              <span className="text-gray-500">Initializing Square payment form...</span>
            </div>
          )}
          {!squareConfig && (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
              <span className="text-gray-500">Loading Square configuration...</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total: ${amount.toFixed(2)}</span>
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
              `Pay $${amount.toFixed(2)} with Square`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}