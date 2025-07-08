import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import { useCart } from "@/hooks/use-cart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainLayout } from "@/components/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
// TODO: Re-enable shipping components when address validation is stable
// import { SimpleShippingForm } from "@/components/forms/SimpleShippingForm";
// import { ShippingRateSelector } from "@/components/forms/ShippingRateSelector";
import { SquarePaymentForm } from "@/components/forms/SquarePaymentForm";
import { SafeKeyPaymentForm } from "@/components/forms/SafeKeyPaymentForm";
import { type ShippingAddress } from "@shared/schema";
import { ApplePayForm } from '@/components/forms/ApplePayForm';
import { GooglePayForm } from '@/components/forms/GooglePayForm';
import { CryptoPaymentForm } from '@/components/forms/CryptoPaymentForm';

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [step, setStep] = useState<'address' | 'payment'>('address');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [selectedRate, setSelectedRate] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'square' | 'safekey' | 'apple_pay' | 'google_pay' | 'crypto'>('stripe');
  const { toast } = useToast();
  const { state: { total, items }, clearCart } = useCart();
  const [, setLocation] = useLocation();

  const billingSchema = z.object({
    name: z.string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name cannot exceed 50 characters")
      .regex(/^[a-zA-Z\s]*$/, "Name can only contain letters and spaces"),
    email: z.string()
      .email("Please enter a valid email address")
      .min(5, "Email must be at least 5 characters")
      .max(50, "Email cannot exceed 50 characters"),
  });

  type BillingForm = z.infer<typeof billingSchema>;

  const form = useForm<BillingForm>({
    resolver: zodResolver(billingSchema),
    mode: "onChange"
  });

  const handleAddressValidated = (address: ShippingAddress) => {
    setShippingAddress(address);
  };

  const handleRateSelected = (rate: any) => {
    setSelectedRate(rate);
  };

  const handlePaymentChange = (event: any) => {
    setPaymentError(event.error ? event.error.message : null);
  };

  const handleSquarePaymentSuccess = async (result: any) => {
    try {
      setIsProcessing(true);

      // Create order record
      const orderData = {
        total: total + (selectedRate?.rate || 0),
        shippingAddress,
        shippingRate: selectedRate,
        paymentMethod: 'square',
        paymentDetails: result
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (response.ok) {
        clearCart();
        setLocation('/order-confirmation');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      setPaymentError(error.message);
      toast({
        title: "Order Creation Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSafeKeyPaymentSuccess = async (result: any) => {
    try {
      setIsProcessing(true);

      // Create order record
      const orderData = {
        total: total + (selectedRate?.rate || 0),
        shippingAddress,
        shippingRate: selectedRate,
        paymentMethod: 'safekey',
        paymentDetails: result
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (response.ok) {
        clearCart();
        setLocation('/order-confirmation');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      setPaymentError(error.message);
      toast({
        title: "Order Creation Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

   const handleApplePayPaymentSuccess = async (result: any) => {
    try {
      setIsProcessing(true);

      // Create order record
      const orderData = {
        total: total + (selectedRate?.rate || 0),
        shippingAddress,
        shippingRate: selectedRate,
        paymentMethod: 'apple_pay',
        paymentDetails: result
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (response.ok) {
        clearCart();
        setLocation('/order-confirmation');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      setPaymentError(error.message);
      toast({
        title: "Order Creation Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGooglePayPaymentSuccess = async (result: any) => {
    try {
      setIsProcessing(true);

      // Create order record
      const orderData = {
        total: total + (selectedRate?.rate || 0),
        shippingAddress,
        shippingRate: selectedRate,
        paymentMethod: 'google_pay',
        paymentDetails: result
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (response.ok) {
        clearCart();
        setLocation('/order-confirmation');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      setPaymentError(error.message);
      toast({
        title: "Order Creation Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

    const handleCryptoPaymentSuccess = async (result: any) => {
    try {
      setIsProcessing(true);

      // Create order record
      const orderData = {
        total: total + (selectedRate?.rate || 0),
        shippingAddress,
        shippingRate: selectedRate,
        paymentMethod: 'crypto',
        paymentDetails: result
      };

      const response = await apiRequest("POST", "/api/orders", orderData);

      if (response.ok) {
        clearCart();
        setLocation('/order-confirmation');
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      setPaymentError(error.message);
      toast({
        title: "Order Creation Failed",
        description: "Payment was successful but order creation failed. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueToPayment = () => {
    if (shippingAddress && selectedRate) {
      setStep('payment');
    } else {
      toast({
        title: "Missing Information",
        description: "Please complete all shipping information",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: BillingForm) => {
    if (!selectedRate || !shippingAddress) {
      return;
    }

    // Only require Stripe elements if using Stripe payment
    if (paymentMethod === 'stripe' && (!stripe || !elements)) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const handleStripePayment = async (formData: BillingForm) => {
    if (!stripe || !elements) return;

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setPaymentError(submitError.message || 'Payment submission failed');
      return;
    }

    try {
      console.log('Creating payment intent for amount:', total + (selectedRate?.rate || 0));

      const response = await apiRequest("POST", "/api/create-payment-intent", {
        amount: total + (selectedRate?.rate || 0)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Payment intent creation failed:', response.status, errorText);
        throw new Error(`Failed to create payment intent: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Payment intent response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse payment intent response as JSON:', responseText);
        throw new Error('Invalid response from payment server');
      }

      const { clientSecret } = responseData;

      if (!clientSecret) {
        throw new Error('No client secret received from server');
      }

      console.log('Confirming payment with client secret');

      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/order-confirmation`,
          payment_method_data: {
            billing_details: {
              name: formData.name,
              email: formData.email,
            },
          },
        },
      });

      if (error) {
        console.error('Stripe payment confirmation error:', error);
        setPaymentError(error.message || 'Payment failed');
      } else {
        console.log('Payment succeeded, creating order');
        // Payment succeeded, create order
        await apiRequest("POST", "/api/orders", {
          items,
          total: total + (selectedRate?.rate || 0),
          shippingAddress,
          paymentMethod: 'stripe'
        });

        clearCart();
        setLocation('/order-confirmation');
      }
    } catch (error: any) {
      console.error('Payment processing error:', error);
      setPaymentError(error.message || 'Payment processing failed');
    }
  };

    if (paymentMethod === 'stripe') {
      await handleStripePayment(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center mb-6">
        <div className={`flex items-center ${step === 'address' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="flex items-center justify-center h-8 w-8 rounded-full border border-current">
            1
          </div>
          <span className="ml-2 font-medium">Shipping</span>
        </div>
        <div className="w-16 h-0.5 mx-2 bg-muted"></div>
        <div className={`flex items-center ${step === 'payment' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className="flex items-center justify-center h-8 w-8 rounded-full border border-current">
            2
          </div>
          <span className="ml-2 font-medium">Payment</span>
        </div>
      </div>

      {step === 'address' ? (
        // Step 1: Shipping Address and Method
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Shipping Address</h2>

            {/* Simplified shipping address for payment testing - no validation required */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                <strong>Note:</strong> Address validation temporarily disabled for payment testing. 
                Using simplified shipping for Stripe and Square payment integration testing.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Set default test address for payment processing
                  const testAddress = {
                    firstName: "Test",
                    lastName: "Customer", 
                    address1: "123 Main Street",
                    address2: "",
                    city: "Napa",
                    state: "CA",
                    postalCode: "94559",
                    country: "US",
                    phone: "555-123-4567"
                  };
                  handleAddressValidated(testAddress);

                  // Set default shipping rate for testing
                  const testRate = {
                    carrier: "USPS",
                    service: "Ground",
                    rate: 9.99,
                    estimatedDays: 3
                  };
                  handleRateSelected(testRate);
                }}
                className="w-full"
              >
                Use Test Address & Shipping - Continue to Payment Testing
              </Button>
            </div>
          </div>

          <Button 
            onClick={handleContinueToPayment}
            className="w-full mt-4"
            disabled={!shippingAddress || !selectedRate}
          >
            Continue to Payment
          </Button>
        </div>
      ) : (
        // Step 2: Billing and Payment
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-4">Shipping Summary</h2>
                  {shippingAddress && (
                    <div className="border rounded-lg p-4 mb-4">
                      <div className="flex items-center text-sm text-muted-foreground mb-2">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Verified shipping address
                      </div>
                      <p className="font-medium">{shippingAddress.firstName} {shippingAddress.lastName}</p>
                      <p>{shippingAddress.address1}</p>
                      {shippingAddress.address2 && <p>{shippingAddress.address2}</p>}
                      <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}</p>
                      <p>{shippingAddress.country}</p>
                      <p>{shippingAddress.phone}</p>

                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium">Shipping Method:</p>
                        <p>{selectedRate.carrier} - {selectedRate.service}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedRate.estimatedDays === 1 
                            ? "Estimated 1 day delivery"
                            : selectedRate.estimatedDays > 1
                            ? `Estimated ${selectedRate.estimatedDays} days delivery`
                            : "Delivery time unknown"
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStep('address')}
                  >
                    Edit shipping info
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="John Doe"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            {...field} 
                            placeholder="john@example.com"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <h3 className="text-md font-semibold mt-4">Choose Payment Method</h3>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'stripe' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="font-medium">Stripe</span>
                    <span className="text-xs text-muted-foreground">Cards, Digital Wallets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('square')}
                    className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'square' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-sm"></div>
                    </div>
                    <span className="font-medium">Square</span>
                    <span className="text-xs text-muted-foreground">Secure Processing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('safekey')}
                    className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'safekey' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <span className="font-medium">SafeKey</span>
                    <span className="text-xs text-muted-foreground">Mobile Authorization</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'apple_pay' 
                        ? 'border-gray-800 bg-gray-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                      <span className="text-white text-xs">🍎</span>
                    </div>
                    <span className="font-medium">Apple Pay</span>
                    <span className="text-xs text-muted-foreground">Touch ID, Face ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('google_pay')}
                    className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'google_pay' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs">G</span>
                    </div>
                    <span className="font-medium">Google Pay</span>
                    <span className="text-xs text-muted-foreground">Secure, Fast</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('crypto')}
                    className={`p-4 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      paymentMethod === 'crypto' 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs">₿</span>
                    </div>
                    <span className="font-medium">Crypto</span>
                    <span className="text-xs text-muted-foreground">BTC, ETH, USDC</span>
                  </button>
                </div>

                {/* Render payment form based on selection */}
                {paymentMethod === 'stripe' ? (
                  <PaymentElement 
                    onChange={handlePaymentChange}
                    options={{
                      layout: {
                        type: 'tabs',
                        defaultCollapsed: false,
                      }
                    }} 
                  />
                ) : paymentMethod === 'square' ? (
                  <div className="mt-4">
                    <SquarePaymentForm 
                      amount={total + (selectedRate?.rate || 0)}
                      onPaymentSuccess={handleSquarePaymentSuccess}
                      onPaymentError={setPaymentError}
                    />
                  </div>
                ) : paymentMethod === 'safekey' ? (
                  <div className="mt-4">
                    <SafeKeyPaymentForm 
                      amount={total + (selectedRate?.rate || 0)}
                      onPaymentSuccess={handleSafeKeyPaymentSuccess}
                      onPaymentError={setPaymentError}
                    />
                  </div>
                ) : paymentMethod === 'apple_pay' ? (
                  <ApplePayForm
                    amount={total + (selectedRate?.rate || 0)}
                    onPaymentSuccess={handleApplePayPaymentSuccess}
                    onPaymentError={setPaymentError}
                  />
                ) : paymentMethod === 'google_pay' ? (
                  <GooglePayForm
                    amount={total + (selectedRate?.rate || 0)}
                    onPaymentSuccess={handleGooglePayPaymentSuccess}
                    onPaymentError={setPaymentError}
                  />
                ) : (
                  <CryptoPaymentForm
                    amount={total + (selectedRate?.rate || 0)}
                    onPaymentSuccess={handleCryptoPaymentSuccess}
                    onPaymentError={setPaymentError}
                  />
                )}

                {paymentError && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Shipping</span>
                    <span>${selectedRate?.rate.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>${(total + (selectedRate?.rate || 0)).toFixed(2)}</span>
                  </div>
                </div>

{paymentMethod === 'stripe' && (
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isProcessing || !stripe || !elements}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${(total + (selectedRate?.rate || 0)).toFixed(2)} with Stripe`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </form>
        </Form>
      )}
    </div>
  );
}

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState<string>("");
  const { state: { total, items } } = useCart();

  // Create payment intent when component mounts
  useEffect(() => {
    if (items.length > 0) {
      apiRequest("POST", "/api/create-payment-intent", { amount: total })
        .then((res) => res.json())
        .then((data) => setClientSecret(data.clientSecret))
        .catch((error) => {
          console.error("Failed to create payment intent:", error);
        });
    }
  }, [total, items]);

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-6">Your cart is empty</p>
                <Link href="/shop">
                  <Button>Continue Shopping</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!clientSecret) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent>
              <Elements stripe={stripePromise} options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                }
              }}>
                <CheckoutForm />
              </Elements>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}