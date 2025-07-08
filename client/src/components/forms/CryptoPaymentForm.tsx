
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Bitcoin, Coins, Copy, ExternalLink } from 'lucide-react';

interface CryptoPaymentFormProps {
  amount: number;
  onPaymentSuccess: (result: any) => void;
  onPaymentError: (error: string) => void;
}

interface ExchangeRate {
  cryptocurrency: string;
  fiatCurrency: string;
  rate: number;
  timestamp: number;
}

export function CryptoPaymentForm({ amount, onPaymentSuccess, onPaymentError }: CryptoPaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('bitcoin');
  const [selectedProvider, setSelectedProvider] = useState<string>('stripe');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  // Load exchange rates
  useEffect(() => {
    const loadExchangeRates = async () => {
      try {
        const response = await fetch('/api/crypto/exchange-rates?currency=USD');
        const data = await response.json();
        
        if (response.ok && Array.isArray(data)) {
          setExchangeRates(data);
        } else {
          console.error('Invalid exchange rates response:', data);
          // Set fallback rates
          setExchangeRates([
            { cryptocurrency: 'bitcoin', fiatCurrency: 'USD', rate: 45000, timestamp: Date.now() },
            { cryptocurrency: 'ethereum', fiatCurrency: 'USD', rate: 3200, timestamp: Date.now() },
            { cryptocurrency: 'usdc', fiatCurrency: 'USD', rate: 1.00, timestamp: Date.now() },
            { cryptocurrency: 'tether', fiatCurrency: 'USD', rate: 1.00, timestamp: Date.now() },
            { cryptocurrency: 'litecoin', fiatCurrency: 'USD', rate: 100, timestamp: Date.now() },
            { cryptocurrency: 'cardano', fiatCurrency: 'USD', rate: 0.85, timestamp: Date.now() },
            { cryptocurrency: 'solana', fiatCurrency: 'USD', rate: 125, timestamp: Date.now() },
            { cryptocurrency: 'polygon', fiatCurrency: 'USD', rate: 1.20, timestamp: Date.now() },
            { cryptocurrency: 'avalanche', fiatCurrency: 'USD', rate: 35, timestamp: Date.now() },
            { cryptocurrency: 'chainlink', fiatCurrency: 'USD', rate: 18, timestamp: Date.now() },
            { cryptocurrency: 'uniswap', fiatCurrency: 'USD', rate: 12, timestamp: Date.now() },
            { cryptocurrency: 'binancecoin', fiatCurrency: 'USD', rate: 420, timestamp: Date.now() }
          ]);
        }
      } catch (error) {
        console.error('Failed to load exchange rates:', error);
        // Set fallback rates
        setExchangeRates([
          { cryptocurrency: 'bitcoin', fiatCurrency: 'USD', rate: 45000, timestamp: Date.now() },
          { cryptocurrency: 'ethereum', fiatCurrency: 'USD', rate: 3200, timestamp: Date.now() },
          { cryptocurrency: 'usdc', fiatCurrency: 'USD', rate: 1.00, timestamp: Date.now() },
          { cryptocurrency: 'tether', fiatCurrency: 'USD', rate: 1.00, timestamp: Date.now() },
          { cryptocurrency: 'litecoin', fiatCurrency: 'USD', rate: 100, timestamp: Date.now() },
          { cryptocurrency: 'cardano', fiatCurrency: 'USD', rate: 0.85, timestamp: Date.now() },
          { cryptocurrency: 'solana', fiatCurrency: 'USD', rate: 125, timestamp: Date.now() },
          { cryptocurrency: 'polygon', fiatCurrency: 'USD', rate: 1.20, timestamp: Date.now() },
          { cryptocurrency: 'avalanche', fiatCurrency: 'USD', rate: 35, timestamp: Date.now() },
          { cryptocurrency: 'chainlink', fiatCurrency: 'USD', rate: 18, timestamp: Date.now() },
          { cryptocurrency: 'uniswap', fiatCurrency: 'USD', rate: 12, timestamp: Date.now() },
          { cryptocurrency: 'binancecoin', fiatCurrency: 'USD', rate: 420, timestamp: Date.now() }
        ]);
      }
    };

    loadExchangeRates();
  }, []);

  // Calculate crypto amount when crypto selection changes
  useEffect(() => {
    if (Array.isArray(exchangeRates) && exchangeRates.length > 0) {
      const rate = exchangeRates.find(r => r.cryptocurrency === selectedCrypto);
      if (rate) {
        setCryptoAmount(amount / rate.rate);
      }
    }
  }, [selectedCrypto, amount, exchangeRates]);

  const handleCryptoPayment = async () => {
    setIsProcessing(true);
    setPaymentStatus('pending');
    onPaymentError('');

    try {
      const endpoint = selectedProvider === 'stripe' 
        ? '/api/crypto/stripe/process-payment'
        : '/api/crypto/coinbase/process-payment';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'USD',
          cryptocurrency: selectedCrypto,
          description: 'Jesus Walks Napa Valley Purchase',
          merchantReference: `ORDER-${Date.now()}`,
          customerEmail: 'customer@example.com'
        })
      });

      const result = await response.json();

      if (result.success) {
        setPaymentUrl(result.paymentUrl || '');
        setWalletAddress(result.walletAddress || '');
        setCryptoAmount(result.cryptoAmount || 0);

        toast({
          title: "Payment Initiated",
          description: "Your cryptocurrency payment has been initiated. Please complete the payment using the provided details.",
        });

        // Start polling for payment status
        startPaymentStatusPolling(result.paymentId);
      } else {
        setPaymentStatus('error');
        onPaymentError(result.error || 'Crypto payment failed');
      }
    } catch (error: any) {
      setPaymentStatus('error');
      onPaymentError(error.message || 'Crypto payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentStatusPolling = (paymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/crypto/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            provider: selectedProvider
          })
        });

        const result = await response.json();

        if (result.success) {
          clearInterval(pollInterval);
          setPaymentStatus('success');
          onPaymentSuccess(result);
          toast({
            title: "Payment Successful",
            description: "Your cryptocurrency payment has been confirmed!",
          });
        } else if (result.error && result.error.includes('expired')) {
          clearInterval(pollInterval);
          setPaymentStatus('error');
          onPaymentError('Payment expired. Please try again.');
        }
      } catch (error) {
        console.error('Payment status polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 30 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'pending') {
        setPaymentStatus('error');
        onPaymentError('Payment verification timeout');
      }
    }, 30 * 60 * 1000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Address copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getCryptoIcon = (crypto: string) => {
    switch (crypto) {
      case 'bitcoin':
        return <Bitcoin className="h-4 w-4" />;
      case 'ethereum':
      case 'usdc':
        return <Coins className="h-4 w-4" />;
      case 'litecoin':
        return <Coins className="h-4 w-4" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  const getCryptoSymbol = (crypto: string) => {
    const symbols: { [key: string]: string } = {
      bitcoin: 'BTC',
      ethereum: 'ETH',
      usdc: 'USDC',
      tether: 'USDT',
      litecoin: 'LTC',
      cardano: 'ADA',
      solana: 'SOL',
      polygon: 'MATIC',
      avalanche: 'AVAX',
      chainlink: 'LINK',
      uniswap: 'UNI',
      binancecoin: 'BNB'
    };
    return symbols[crypto] || crypto.toUpperCase();
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5" />
          Cryptocurrency Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentStatus === 'idle' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cryptocurrency</label>
                <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bitcoin">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="h-4 w-4" />
                        Bitcoin (BTC)
                      </div>
                    </SelectItem>
                    <SelectItem value="ethereum">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Ethereum (ETH)
                      </div>
                    </SelectItem>
                    <SelectItem value="usdc">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        USDC (Stablecoin)
                      </div>
                    </SelectItem>
                    <SelectItem value="tether">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Tether (USDT)
                      </div>
                    </SelectItem>
                    <SelectItem value="litecoin">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Litecoin (LTC)
                      </div>
                    </SelectItem>
                    <SelectItem value="cardano">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Cardano (ADA)
                      </div>
                    </SelectItem>
                    <SelectItem value="solana">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Solana (SOL)
                      </div>
                    </SelectItem>
                    <SelectItem value="polygon">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Polygon (MATIC)
                      </div>
                    </SelectItem>
                    <SelectItem value="avalanche">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Avalanche (AVAX)
                      </div>
                    </SelectItem>
                    <SelectItem value="chainlink">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Chainlink (LINK)
                      </div>
                    </SelectItem>
                    <SelectItem value="uniswap">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Uniswap (UNI)
                      </div>
                    </SelectItem>
                    <SelectItem value="binancecoin">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4" />
                        Binance Coin (BNB)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe Crypto</SelectItem>
                    <SelectItem value="coinbase">Coinbase Commerce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">USD Amount:</span>
                <span className="font-semibold">${amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {getCryptoSymbol(selectedCrypto)} Amount:
                </span>
                <span className="font-semibold flex items-center gap-1">
                  {getCryptoIcon(selectedCrypto)}
                  {cryptoAmount.toFixed(8)}
                </span>
              </div>
            </div>

            <Button 
              onClick={handleCryptoPayment}
              disabled={isProcessing}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Initiating Payment...
                </>
              ) : (
                <>
                  {getCryptoIcon(selectedCrypto)}
                  <span className="ml-2">Pay with {getCryptoSymbol(selectedCrypto)}</span>
                </>
              )}
            </Button>
          </>
        )}

        {paymentStatus === 'pending' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="animate-pulse text-orange-600 mb-2">
                <Bitcoin className="h-8 w-8 mx-auto" />
              </div>
              <p className="font-medium">Payment Initiated</p>
              <p className="text-sm text-muted-foreground">
                Complete your payment using the details below
              </p>
            </div>

            {paymentUrl && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Payment URL:</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentUrl, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Payment Page
                  </Button>
                </div>
              </div>
            )}

            {walletAddress && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Send {getCryptoSymbol(selectedCrypto)} to:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white p-2 rounded border text-xs font-mono">
                    {walletAddress}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(walletAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Amount: {cryptoAmount.toFixed(8)} {getCryptoSymbol(selectedCrypto)}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>Waiting for payment confirmation...</span>
            </div>
          </div>
        )}

        {paymentStatus === 'success' && (
          <div className="text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
            <p className="font-medium text-green-600">Payment Confirmed!</p>
            <p className="text-sm text-muted-foreground">
              Your cryptocurrency payment has been successfully processed.
            </p>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="text-center space-y-2">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-red-600 text-xl">×</span>
            </div>
            <p className="font-medium text-red-600">Payment Failed</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setPaymentStatus('idle');
                setPaymentUrl('');
                setWalletAddress('');
              }}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
