/**
 * Square Payment Integration Service
 * 
 * This service provides Square payment processing capabilities for the Jesus Walks Napa Valley application.
 * It handles both sandbox (development) and production environments automatically based on NODE_ENV.
 * 
 * Features:
 * - Automatic environment detection (sandbox vs production)
 * - Payment tokenization through Square Web SDK
 * - Secure payment processing with proper error handling
 * 
 * Environment Variables Required:
 * - SQUARE_APPLICATION_ID_SANDBOX: Square sandbox application ID
 * - SQUARE_ACCESS_TOKEN_SANDBOX: Square sandbox access token
 * - SQUARE_APPLICATION_ID_PRODUCTION: Square production application ID  
 * - SQUARE_ACCESS_TOKEN_PRODUCTION: Square production access token
 */

// Determine environment and select appropriate Square configuration
const isDevelopment = process.env.NODE_ENV !== 'production';

// Square Application ID - automatically switches between sandbox and production
export const squareApplicationId = isDevelopment 
  ? 'sandbox-sq0idb-b3G3QhqMv8dmZkEJnG10kw'  // Sandbox ID for development/testing
  : 'sq0idp-C-wqKe8QpQAHwg3YtLziEw';         // Production ID for live payments

// Square Environment setting for SDK initialization
export const squareEnvironment = isDevelopment ? 'sandbox' : 'production';

/**
 * Interface for Square payment token received from frontend
 * Contains the tokenized payment information from Square Web SDK
 */
export interface SquarePaymentToken {
  token: string;    // Encrypted payment token from Square
  details: any;     // Additional payment details (card type, last 4 digits, etc.)
}

/**
 * Interface for Square payment processing result
 * Standardized response format for payment operations
 */
export interface SquarePaymentResult {
  success: boolean;       // Whether the payment was successful
  paymentId?: string;     // Square payment ID if successful
  error?: string;         // Error message if payment failed
}