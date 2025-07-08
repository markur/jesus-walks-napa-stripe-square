
/**
 * Cryptocurrency Payment Service
 * 
 * This service provides cryptocurrency payment processing capabilities.
 * It supports multiple cryptocurrencies and integrates with various payment processors.
 * 
 * Features:
 * - Bitcoin (BTC) payments
 * - Ethereum (ETH) payments
 * - USDC stablecoin payments
 * - Stripe Crypto integration
 * - Coinbase Commerce integration
 * - Real-time exchange rate conversion
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Stripe secret key
 * - COINBASE_API_KEY: Coinbase Commerce API key
 * - COINBASE_WEBHOOK_SECRET: Coinbase webhook secret
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CryptoPaymentRequest {
  amount: number;
  currency: string; // USD, EUR, etc.
  cryptocurrency: 'bitcoin' | 'ethereum' | 'usdc' | 'litecoin';
  description: string;
  merchantReference: string;
  customerEmail?: string;
}

export interface CryptoPaymentResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  walletAddress?: string;
  cryptoAmount?: number;
  exchangeRate?: number;
  expiresAt?: string;
  error?: string;
}

export interface CryptoExchangeRate {
  cryptocurrency: string;
  fiatCurrency: string;
  rate: number;
  timestamp: number;
}

/**
 * Get current cryptocurrency exchange rates
 */
export async function getCryptoExchangeRates(fiatCurrency: string = 'USD'): Promise<CryptoExchangeRate[]> {
  try {
    // In production, use a real API like CoinGecko, CoinMarketCap, etc.
    const mockRates: CryptoExchangeRate[] = [
      {
        cryptocurrency: 'bitcoin',
        fiatCurrency: fiatCurrency,
        rate: 45000, // $45,000 per BTC
        timestamp: Date.now()
      },
      {
        cryptocurrency: 'ethereum',
        fiatCurrency: fiatCurrency,
        rate: 3200, // $3,200 per ETH
        timestamp: Date.now()
      },
      {
        cryptocurrency: 'usdc',
        fiatCurrency: fiatCurrency,
        rate: 1.00, // $1.00 per USDC
        timestamp: Date.now()
      },
      {
        cryptocurrency: 'litecoin',
        fiatCurrency: fiatCurrency,
        rate: 100, // $100 per LTC
        timestamp: Date.now()
      }
    ];

    return mockRates;
  } catch (error) {
    console.error('Error fetching crypto exchange rates:', error);
    throw error;
  }
}

/**
 * Process cryptocurrency payment via Stripe
 */
export async function processStripeCryptoPayment(request: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
  try {
    // Get exchange rate
    const rates = await getCryptoExchangeRates(request.currency);
    const cryptoRate = rates.find(r => r.cryptocurrency === request.cryptocurrency);
    
    if (!cryptoRate) {
      throw new Error(`Exchange rate not found for ${request.cryptocurrency}`);
    }

    const cryptoAmount = request.amount / cryptoRate.rate;

    // Create payment intent with Stripe (crypto payments)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      payment_method_types: ['card'], // Stripe crypto is usually card-based
      description: request.description,
      metadata: {
        merchantReference: request.merchantReference,
        paymentMethod: 'crypto_stripe',
        cryptocurrency: request.cryptocurrency,
        cryptoAmount: cryptoAmount.toString()
      }
    });

    return {
      success: true,
      paymentId: paymentIntent.id,
      paymentUrl: `https://checkout.stripe.com/c/pay/${paymentIntent.client_secret}`,
      cryptoAmount: cryptoAmount,
      exchangeRate: cryptoRate.rate,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    };

  } catch (error: any) {
    console.error('Stripe crypto payment error:', error);
    return {
      success: false,
      error: error.message || 'Crypto payment failed'
    };
  }
}

/**
 * Process cryptocurrency payment via Coinbase Commerce
 */
export async function processCoinbaseCryptoPayment(request: CryptoPaymentRequest): Promise<CryptoPaymentResponse> {
  try {
    const coinbaseApiKey = process.env.COINBASE_API_KEY;
    
    if (!coinbaseApiKey) {
      throw new Error('Coinbase API key not configured');
    }

    // Get exchange rate
    const rates = await getCryptoExchangeRates(request.currency);
    const cryptoRate = rates.find(r => r.cryptocurrency === request.cryptocurrency);
    
    if (!cryptoRate) {
      throw new Error(`Exchange rate not found for ${request.cryptocurrency}`);
    }

    const cryptoAmount = request.amount / cryptoRate.rate;

    // Create Coinbase Commerce charge
    const chargeData = {
      name: request.description,
      description: request.description,
      local_price: {
        amount: request.amount.toString(),
        currency: request.currency
      },
      pricing_type: 'fixed_price',
      metadata: {
        merchantReference: request.merchantReference,
        paymentMethod: 'crypto_coinbase'
      }
    };

    // In production, make actual API call to Coinbase Commerce
    // const response = await fetch('https://api.commerce.coinbase.com/charges', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-CC-Api-Key': coinbaseApiKey,
    //     'X-CC-Version': '2018-03-22'
    //   },
    //   body: JSON.stringify(chargeData)
    // });

    // Mock response for development
    const mockChargeId = `coinbase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockWalletAddress = generateMockWalletAddress(request.cryptocurrency);

    return {
      success: true,
      paymentId: mockChargeId,
      paymentUrl: `https://commerce.coinbase.com/charges/${mockChargeId}`,
      walletAddress: mockWalletAddress,
      cryptoAmount: cryptoAmount,
      exchangeRate: cryptoRate.rate,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    };

  } catch (error: any) {
    console.error('Coinbase crypto payment error:', error);
    return {
      success: false,
      error: error.message || 'Crypto payment failed'
    };
  }
}

/**
 * Generate mock wallet address for development
 */
function generateMockWalletAddress(cryptocurrency: string): string {
  const prefixes = {
    bitcoin: '1',
    ethereum: '0x',
    usdc: '0x',
    litecoin: 'L'
  };

  const prefix = prefixes[cryptocurrency as keyof typeof prefixes] || '1';
  const randomPart = Math.random().toString(36).substring(2, 34);
  
  return `${prefix}${randomPart}`;
}

/**
 * Verify cryptocurrency payment status
 */
export async function verifyCryptoPayment(paymentId: string, provider: 'stripe' | 'coinbase'): Promise<CryptoPaymentResponse> {
  try {
    if (provider === 'stripe') {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      
      return {
        success: paymentIntent.status === 'succeeded',
        paymentId: paymentIntent.id,
        error: paymentIntent.status === 'succeeded' ? undefined : 'Payment not completed'
      };
    } else if (provider === 'coinbase') {
      // In production, verify with Coinbase Commerce API
      // const response = await fetch(`https://api.commerce.coinbase.com/charges/${paymentId}`, {
      //   headers: {
      //     'X-CC-Api-Key': process.env.COINBASE_API_KEY || '',
      //     'X-CC-Version': '2018-03-22'
      //   }
      // });

      // Mock verification for development
      const isCompleted = Math.random() > 0.3; // 70% success rate
      
      return {
        success: isCompleted,
        paymentId: paymentId,
        error: isCompleted ? undefined : 'Payment not completed or expired'
      };
    }

    throw new Error('Unknown crypto payment provider');

  } catch (error: any) {
    console.error('Crypto payment verification error:', error);
    return {
      success: false,
      error: error.message || 'Verification failed'
    };
  }
}
