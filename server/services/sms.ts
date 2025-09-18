import axios from 'axios';

export interface SMSConfig {
  textbeltUrl: string;
  enabled: boolean;
}

export class SMSService {
  private config: SMSConfig;
  private enabled: boolean = false;

  constructor() {
    this.config = {
      textbeltUrl: process.env.TEXTBELT_URL || 'http://localhost:9000',
      enabled: true
    };

    this.initialize();
  }

  private initialize(): void {
    // Check if TextBelt service is available
    if (!this.config.textbeltUrl) {
      console.log('No TextBelt URL configured. SMS functionality will be disabled.');
      this.enabled = false;
      return;
    }

    this.enabled = true;
    console.log('SMS service initialized with TextBelt at:', this.config.textbeltUrl);
  }

  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[SIMULATED] SMS would be sent to: ${this.maskPhoneNumber(phoneNumber)}`);
      return true;
    }

    try {
      // Clean phone number (remove non-digits)
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      
      if (cleanedPhone.length < 10) {
        console.error(`Invalid phone number format`);
        return false;
      }

      // Use URLSearchParams for proper form encoding
      const formData = new URLSearchParams();
      formData.append('phone', cleanedPhone);
      formData.append('message', message);
      formData.append('key', process.env.TEXTBELT_KEY || 'textbelt');

      const response = await axios.post(`${this.config.textbeltUrl}/text`, formData, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data?.success) {
        console.log(`SMS sent successfully to: ${this.maskPhoneNumber(phoneNumber)}`);
        return true;
      } else {
        console.error('SMS failed:', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('Failed to send SMS:', error.message);
      return false;
    }
  }

  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      return `${cleaned.slice(0, 3)}-***-${cleaned.slice(-4)}`;
    }
    return '***-****';
  }

  async sendOrderConfirmationSMS(phoneNumber: string, order: any): Promise<boolean> {
    const message = `Jesus Walks Napa - Order #${order.id} confirmed! Total: $${order.total}. We'll notify you when it ships. Questions? Call 707-812-2559 or email info@jesuswalksnapa.com`;
    
    return this.sendSMS(phoneNumber, message);
  }

  async sendShippingNotificationSMS(phoneNumber: string, order: any, trackingNumber: string): Promise<boolean> {
    const message = `Jesus Walks Napa - Your order #${order.id} has shipped! Tracking: ${trackingNumber}. Questions? 707-812-2559`;
    
    return this.sendSMS(phoneNumber, message);
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Create singleton instance
export const smsService = new SMSService();