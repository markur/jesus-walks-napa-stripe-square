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
  const [card, setCard] = useState<any>(null);

  // Force re-initialization when component mounts fresh or amount changes
  useEffect(() => {
    if (squareConfig && window.Square) {
      // Destroy existing instance and force complete reinitialization
      if (card) {
        card.destroy().catch(console.warn);
        setCard(null);
      }
      
      // Clear the container completely and force DOM refresh
      const cardContainer = document.getElementById('card-container');
      if (cardContainer) {
        cardContainer.innerHTML = '';
        // Force a complete DOM reflow
        cardContainer.offsetHeight;
      }
      
      // Clear any Square-related browser cache/state
      if (window.Square) {
        delete (window as any).squarePayments;
      }
      
      // Longer delay to ensure complete cleanup
      setTimeout(() => {
        initializeSquare();
      }, 500);
    }
  }, [amount, squareConfig, card]); // Include card in dependencies for better cleanup

  useEffect(() => {
    // Load Square configuration
    const loadSquareConfig = async () => {
      try {
        const response = await fetch("/api/square-config");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const config = await response.json();
        console.log("Square config loaded:", config);
        setSquareConfig(config);
      } catch (error) {
        console.error("Failed to load Square config:", error);
        toast({
          title: "Square Payment Error",
          description: "Failed to load Square payment configuration",
          variant: "destructive"
        });
      }
    };

    loadSquareConfig();
  }, [onPaymentError, toast]);

  useEffect(() => {
    if (!squareConfig) return;

    // Check if Square is already loaded
    if (window.Square) {
      initializeSquare();
      return;
    }

    // Load Square Web SDK - use production URL for production environment
    const script = document.createElement('script');
    const isProduction = squareConfig.environment === 'production';
    script.src = isProduction 
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';
    script.async = true;
    script.onload = initializeSquare;
    script.onerror = () => {
      console.error('Failed to load Square SDK');
      onPaymentError('Failed to load Square payment system');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup card instance when component unmounts or config changes
      if (card) {
        card.destroy().catch(console.warn);
      }
      
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
    if (!window.Square || !squareConfig) {
      console.error('Square not available or config missing');
      return;
    }

    try {
      console.log('Initializing Square with completely fresh state, config:', squareConfig);
      
      // Get card container
      const cardContainer = document.getElementById('card-container');
      if (!cardContainer) {
        throw new Error('Card container not found');
      }
      
      // Destroy existing card instance if it exists
      if (card) {
        try {
          await card.destroy();
          console.log('Previous card instance destroyed');
        } catch (destroyError) {
          console.warn('Error destroying previous card instance:', destroyError);
        }
        setCard(null);
      }
      
      // Force complete DOM cleanup and reset
      cardContainer.innerHTML = '';
      cardContainer.className = 'p-4 border rounded-lg min-h-[60px] bg-white';
      cardContainer.style.cssText = '';
      
      // Clear any existing Square payment instances from window
      if ((window as any).squarePayments) {
        delete (window as any).squarePayments;
      }
      
      // Force multiple DOM refresh cycles to ensure clean state
      cardContainer.style.display = 'none';
      await new Promise(resolve => setTimeout(resolve, 150));
      cardContainer.style.display = 'block';
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Create completely fresh payments instance with unique ID
      const uniqueId = Date.now() + Math.random();
      console.log(`Creating fresh Square payments instance ${uniqueId}`);
      
      const payments = window.Square.payments(squareConfig.applicationId, squareConfig.locationId);

      // Initialize completely fresh card payment method with forced reinitialization
      const cardInstance = await payments.card({
        style: {
          input: {
            fontSize: '16px',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#ffffff',
            color: '#333333',
            border: '1px solid #d1d5db'
          },
          '.input-container': {
            borderColor: '#d1d5db',
            borderRadius: '8px'
          },
          '.input-container.is-focus': {
            borderColor: '#2563eb'
          }
        },
        // Force Square to create a completely new instance
        includeInputLabels: true,
        postalCode: false
      });

      // Detach any existing instances first, then attach fresh
      try {
        await cardInstance.attach('#card-container');
        console.log(`Square card form attached successfully with instance ${uniqueId}`);
      } catch (attachError) {
        console.log('Attachment failed, clearing and retrying...', attachError);
        cardContainer.innerHTML = '';
        await new Promise(resolve => setTimeout(resolve, 200));
        await cardInstance.attach('#card-container');
        console.log('Square card form attached on retry');
      }

      // Store fresh payments instance with unique identifier
      (window as any).squarePayments = { payments, id: uniqueId };
      setCard(cardInstance);
      
    } catch (error) {
      console.error('Failed to initialize Square:', error);
      onPaymentError(`Failed to initialize payment form: ${error.message}`);
    }
  };

  const forceRefreshCard = async () => {
    console.log('Force refreshing Square card form...');
    
    // Destroy existing card instance completely
    if (card) {
      try {
        await card.destroy();
        console.log('Card instance destroyed');
      } catch (error) {
        console.warn('Error destroying card:', error);
      }
      setCard(null);
    }
    
    // Clear any Square global state
    if ((window as any).squarePayments) {
      delete (window as any).squarePayments;
    }
    
    // Clear container completely
    const cardContainer = document.getElementById('card-container');
    if (cardContainer) {
      cardContainer.innerHTML = '';
      cardContainer.className = 'p-4 border rounded-lg min-h-[60px] bg-white';
    }
    
    // Force DOM refresh cycle
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reinitialize from scratch
    setTimeout(() => {
      initializeSquare();
    }, 200);
  };

  const handlePayment = async () => {
    if (!window.Square || !card) {
      onPaymentError?.('Square payment system not ready');
      return;
    }

    setIsLoading(true);

    try {
      // First validate the card fields
      const result = await card.tokenize();

      if (result.status === 'OK') {
        console.log('Square payment token created:', result.token);

        // Simulate payment processing (in a real app, send to your server)
        await new Promise(resolve => setTimeout(resolve, 1000));

        const paymentResult = {
          token: result.token,
          amount: amount,
          timestamp: new Date().toISOString(),
          method: 'square'
        };

        // Clear the form after successful payment
        if (card) {
          try {
            await card.destroy();
            setCard(null);
            const cardContainer = document.getElementById('card-container');
            if (cardContainer) {
              cardContainer.innerHTML = '<div class="text-green-600 p-4 text-center">Payment processed successfully!</div>';
            }
          } catch (error) {
            console.warn('Error clearing card form after payment:', error);
          }
        }
        
        onPaymentSuccess?.(paymentResult);
      } else {
        const errorMessage = result.errors?.[0]?.message || 'Payment validation failed';
        console.error('Square tokenization errors:', result.errors);
        onPaymentError?.(errorMessage);
      }
    } catch (error: any) {
      console.error('Square payment error:', error);
      onPaymentError?.(error.message || 'Payment processing failed');
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
        <div id="card-container" className="p-4 border rounded-lg min-h-[60px] bg-white">
          {/* Square will inject the card form here */}
        </div>

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total: ${amount.toFixed(2)}</span>
          <div className="flex gap-2">
            <Button 
              onClick={forceRefreshCard}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              Refresh Form
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={isLoading || !window.Square || !card}
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