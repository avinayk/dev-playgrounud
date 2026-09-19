// services/emailService.ts
import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Create email transporter
const createTransporter = () => {
  // For development, use ethereal.email (fake SMTP for testing)
  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
 
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'your-ethereal-email@ethereal.email', // Replace with your ethereal credentials
        pass: 'your-ethereal-password'
      }
    });
  }

  // Production SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
  
    const transporter = createTransporter();

    // Try to read email template
    let html = '';
    try {
      const templatePath = path.join(__dirname, '../templates/emails', `${options.template}.html`);
      
      // Check if file exists
      if (fs.existsSync(templatePath)) {
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateContent);
        html = template(options.data);
      } else {
        // Fallback HTML template
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background: #0f0f1a; color: #fff; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 40px; }
              .code { font-size: 36px; font-weight: bold; color: #fbbf24; text-align: center; letter-spacing: 8px; }
              .header { text-align: center; border-bottom: 2px solid #fbbf24; padding-bottom: 20px; }
              .white{ color: #fff; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="white">🏀 Playground League</h1>
              </div>
              <h2 class="white" >Hello ${options.data.name || 'Athlete'}!</h2>
              <pclass="white" >Your verification code is:</p>
              <div class="code">${options.data.code}</div>
              <p class="white">This code expires in 15 minutes.</p>
              <p class="white">If you didn't request this, please ignore this email.</p>
            </div>
          </body>
          </html>
        `;
      }
    } catch (templateError) {
      console.warn('Template error, using fallback:', templateError);
      // Fallback HTML
      html = `
        <h1 class="white">Your verification code: ${options.data.code}</h1>
        <p class="white">This code expires in 15 minutes.</p>
      `;
    }

    // Send email
    const info = await transporter.sendMail({
      from: `"Playground League" <${process.env.SMTP_FROM || 'support@playgroundleague.pro'}>`,
      to: options.to,
      subject: options.subject,
      html: html
    });
 
    return true;

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
};