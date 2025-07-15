
import nodemailer from 'nodemailer';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Use environment variables for email configuration
    const emailConfig: EmailConfig = {
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };

    // Only initialize if we have the required configuration
    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransporter(emailConfig);
    } else {
      console.warn('Email service not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not configured');
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Jesus Walks Napa account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        <p style="margin-top: 20px;">This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Jesus Walks Napa</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Jesus Walks Napa',
      html,
    });
  }

  async sendOrderConfirmationEmail(email: string, order: any): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Total:</strong> $${order.total}</p>
          <p><strong>Status:</strong> ${order.status}</p>
        </div>
        <p>You will receive updates on your order status via email.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Jesus Walks Napa</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Order Confirmation #${order.id} - Jesus Walks Napa`,
      html,
    });
  }

  async sendWelcomeEmail(email: string, username: string): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Jesus Walks Napa!</h2>
        <p>Hello ${username},</p>
        <p>Welcome to Jesus Walks Napa! Your account has been created successfully.</p>
        <p>You can now explore our products and services.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Jesus Walks Napa</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Jesus Walks Napa!',
      html,
    });
  }
}

export const emailService = new EmailService();
