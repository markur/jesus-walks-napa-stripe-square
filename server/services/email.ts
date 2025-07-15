
import nodemailer from 'nodemailer';

interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email environment variables are set
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    };

    // If no email config is provided, use a development configuration
    if (!emailConfig.host || !emailConfig.auth?.user) {
      console.log('No SMTP configuration found. Email functionality will be simulated.');
      this.enabled = false;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport(emailConfig);
      this.enabled = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.enabled = false;
    }
  }

  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[SIMULATED] Welcome email would be sent to: ${to} for user: ${username}`);
      return true;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@jesuswalks.com',
        to,
        subject: 'Welcome to Jesus Walks Napa!',
        html: `
          <h1>Welcome to Jesus Walks Napa, ${username}!</h1>
          <p>Thank you for joining our community. We're excited to have you with us.</p>
          <p>You can now explore our premium wines and vineyard experiences.</p>
          <p>Best regards,<br>The Jesus Walks Napa Team</p>
        `,
      };

      await this.transporter!.sendMail(mailOptions);
      console.log(`Welcome email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, resetToken: string, baseUrl: string): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[SIMULATED] Password reset email would be sent to: ${to}`);
      console.log(`Reset link: ${baseUrl}/reset-password?token=${resetToken}`);
      return true;
    }

    try {
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@jesuswalks.com',
        to,
        subject: 'Password Reset Request - Jesus Walks Napa',
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset for your Jesus Walks Napa account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p>Best regards,<br>The Jesus Walks Napa Team</p>
        `,
      };

      await this.transporter!.sendMail(mailOptions);
      console.log(`Password reset email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  async sendOrderConfirmationEmail(to: string, order: any): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[SIMULATED] Order confirmation email would be sent to: ${to} for order: ${order.id}`);
      return true;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@jesuswalks.com',
        to,
        subject: `Order Confirmation #${order.id} - Jesus Walks Napa`,
        html: `
          <h1>Order Confirmation</h1>
          <p>Thank you for your order! Here are the details:</p>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Total:</strong> $${order.total}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p>We'll process your order shortly and send you an update when it ships.</p>
          <p>Best regards,<br>The Jesus Walks Napa Team</p>
        `,
      };

      await this.transporter!.sendMail(mailOptions);
      console.log(`Order confirmation email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      return false;
    }
  }

  async sendShippingNotificationEmail(to: string, order: any, trackingNumber: string): Promise<boolean> {
    if (!this.enabled) {
      console.log(`[SIMULATED] Shipping notification would be sent to: ${to} for order: ${order.id}`);
      return true;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'noreply@jesuswalks.com',
        to,
        subject: `Your Order #${order.id} Has Shipped - Jesus Walks Napa`,
        html: `
          <h1>Your Order Has Shipped!</h1>
          <p>Great news! Your order #${order.id} is on its way.</p>
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p><strong>Total:</strong> $${order.total}</p>
          <p>You can track your package using the tracking number above.</p>
          <p>Thank you for your business!</p>
          <p>Best regards,<br>The Jesus Walks Napa Team</p>
        `,
      };

      await this.transporter!.sendMail(mailOptions);
      console.log(`Shipping notification email sent successfully to: ${to}`);
      return true;
    } catch (error) {
      console.error('Failed to send shipping notification email:', error);
      return false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const emailService = new EmailService();
