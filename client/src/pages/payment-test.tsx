
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { MainLayout } from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SquarePaymentForm } from "@/components/forms/SquarePaymentForm";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle2 } from "lucide-react";

/**
 * Payment Testing Page
 * 
 * This page provides a comprehensive testing environment for both Stripe and Square
 * payment integrations. It allows developers and stakeholders to verify that both
 * payment processors are working correctly before deploying to production.
 * 
 * Features:
 * - Side-by-side comparison of Stripe and Square payment forms
 * - Test payment amounts for validation
 * - Real-time payment status feedback
 * - Error handling and success notifications
 * 
 * Usage:
 * - Navigate to /payment-test to access this testing interface
 * - Use test card numbers provided by Stripe and Square documentation
 * - Verify both payment methods process transactions correctly
 */

// Initialize Stripe with public key and error handling
const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = stripePublicKey 
  ? loadStripe(stripePublicKey).catch(error => {
      console.error('Failed to load Stripe:', error);
      return null;
    })
  : Promise.resolve(null);

// Test amount for payment validation ($10.00)
const TEST_AMOUNT = 10.00;

/**
 * Stripe Payment Test Component
 * Handles Stripe payment testing with CardElement
 */
function StripeTestForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleStripeTest = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage('');
    
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Create payment method for testing
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setPaymentStatus('error');
      } else {
        setPaymentStatus('success');
        console.log('Stripe payment method created:', paymentMethod);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error occurred');
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      
      <Button 
        onClick={handleStripeTest}
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : `Test Stripe Payment ($${TEST_AMOUNT})`}
      </Button>

      {/* Payment Status Display */}
      {paymentStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>Stripe payment method created successfully!</span>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="text-red-600 text-sm">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}
    </div>
  );
}

/**
 * SafeKey Payment Test Component
 * Handles SafeKey payment testing with push notification approval
 */
function SafeKeyTestForm() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSafeKeyTest = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    setPaymentStatus('pending');

    try {
      // Simulate SafeKey payment initialization
      // In a real implementation, this would integrate with SafeKey's SDK
      const response = await fetch('/api/safekey/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: TEST_AMOUNT,
          currency: 'USD'
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Simulate waiting for mobile app approval
        setTimeout(() => {
          setPaymentStatus('success');
          console.log('SafeKey payment approved via mobile app');
        }, 3000);
      } else {
        setErrorMessage(result.error || 'SafeKey payment failed');
        setPaymentStatus('error');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'SafeKey processing failed');
      setPaymentStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-blue-50">
        <div className="text-center">
          {paymentStatus === 'pending' ? (
            <div className="space-y-2">
              <div className="animate-pulse text-blue-600">
                📱 Check your mobile app for payment approval
              </div>
              <div className="text-sm text-muted-foreground">
                SafeKey notification sent to your registered device
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Card details will be verified via your mobile banking app
            </div>
          )}
        </div>
      </div>
      
      <Button 
        onClick={handleSafeKeyTest}
        disabled={isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isProcessing ? 'Sending notification...' : `Test SafeKey Payment ($${TEST_AMOUNT})`}
      </Button>

      {/* Payment Status Display */}
      {paymentStatus === 'success' && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>SafeKey payment approved via mobile app!</span>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="text-red-600 text-sm">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {paymentStatus === 'pending' && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span>Waiting for mobile app approval...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Main Payment Testing Page Component
 * Renders Stripe, Square, and SafeKey payment forms for comprehensive testing
 */
export default function PaymentTest() {
  const [squareStatus, setSquareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [squareError, setSquareError] = useState<string>('');

  // Handle Square payment success
  const handleSquareSuccess = (result: any) => {
    setSquareStatus('success');
    console.log('Square payment successful:', result);
  };

  // Handle Square payment error
  const handleSquareError = (error: string) => {
    setSquareStatus('error');
    setSquareError(error);
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Payment Integration Testing</h1>
            <p className="text-muted-foreground mb-4">
              Test both Stripe and Square payment integrations to ensure proper functionality
              before deploying to production.
            </p>
            <div className="flex justify-center gap-2">
              <Badge variant="outline">Development Environment</Badge>
              <Badge variant="outline">Test Amount: ${TEST_AMOUNT}</Badge>
            </div>
          </div>

          {/* Payment Testing Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Stripe Payment Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Stripe Payment Testing
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Test Stripe payment integration with secure card processing
                </p>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise}>
                  <StripeTestForm />
                </Elements>
                
                {/* Stripe Test Card Numbers */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Test Card Numbers:</h4>
                  <div className="text-xs space-y-1">
                    <div><strong>Visa:</strong> 4242 4242 4242 4242</div>
                    <div><strong>Mastercard:</strong> 5555 5555 5555 4444</div>
                    <div><strong>Any future date, any CVC</strong></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Square Payment Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-sm"></div>
                  </div>
                  Square Payment Testing
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Test Square payment integration with secure tokenization
                </p>
              </CardHeader>
              <CardContent>
                <SquarePaymentForm
                  amount={TEST_AMOUNT}
                  onPaymentSuccess={handleSquareSuccess}
                  onPaymentError={handleSquareError}
                />

                {/* Square Payment Status */}
                {squareStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm mt-4">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Square payment processed successfully!</span>
                  </div>
                )}

                {squareStatus === 'error' && (
                  <div className="text-red-600 text-sm mt-4">
                    <strong>Error:</strong> {squareError}
                  </div>
                )}

                {/* Square Test Card Numbers */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Square Test Cards:</h4>
                  <div className="text-xs space-y-1">
                    <div><strong>Visa:</strong> 4111 1111 1111 1111</div>
                    <div><strong>Mastercard:</strong> 5105 1051 0510 5100</div>
                    <div><strong>CVV:</strong> Any 3 digits</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SafeKey Payment Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  SafeKey Payment Testing
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Test SafeKey payment with mobile app authorization
                </p>
              </CardHeader>
              <CardContent>
                <SafeKeyTestForm />

                {/* SafeKey Information */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">How SafeKey Works:</h4>
                  <div className="text-xs space-y-1">
                    <div>• Initiates payment request</div>
                    <div>• Sends push notification to mobile app</div>
                    <div>• User approves via fingerprint/face ID</div>
                    <div>• Payment is processed securely</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Testing Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">For Stripe Testing:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                  <li>Use the provided test card numbers</li>
                  <li>Enter any future expiration date</li>
                  <li>Use any 3-digit CVC code</li>
                  <li>Test should create a payment method successfully</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold">For Square Testing:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                  <li>Use Square's sandbox test card numbers</li>
                  <li>Enter any future expiration date</li>
                  <li>Use any 3-digit CVV code</li>
                  <li>Test should process a ${TEST_AMOUNT} payment</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">For SafeKey Testing:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
                  <li>Click the SafeKey payment button</li>
                  <li>Simulates sending a push notification</li>
                  <li>Waits 3 seconds to simulate mobile approval</li>
                  <li>Demonstrates the cutting-edge authorization flow</li>
                </ul>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is a testing environment. No real charges will be made.
                  All transactions use sandbox/test credentials and will not process actual payments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
