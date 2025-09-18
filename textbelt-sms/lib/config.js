const SMTP_TRANSPORT = {
  // Using existing Zoho SMTP credentials for Jesus Walks Napa
  service: 'Zoho', // This helps with automatic STARTTLS configuration
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // false for STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

module.exports = {
  transport: SMTP_TRANSPORT,
  mailOptions: {
    from: process.env.SMTP_FROM || 'info@jesuswalksnapa.com',
  },
  debugEnabled: true, // Enable debug for testing
};
