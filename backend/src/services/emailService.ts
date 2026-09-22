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

/* ═══════════════════════════════════════════
   CREATE TRANSPORTER
   ═══════════════════════════════════════════ */
const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

  // ✅ Dev fallback with Ethereal
  if (process.env.NODE_ENV === 'development' && !smtpUser) {
    console.log('📧 [Email] Using Ethereal (dev mode)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'your-ethereal-email@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'your-ethereal-password',
      },
    });
  }

  // ✅ Parse port and secure correctly
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  // ✅ Auto-detect secure: 465 = true, 587/25 = false
  //    (also allow explicit override via SMTP_SECURE=true/false)
  const secureFromEnv = process.env.SMTP_SECURE;
  const secure =
    secureFromEnv === 'true'
      ? true
      : secureFromEnv === 'false'
      ? false
      : port === 465; // auto-detect based on port

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // ✅ Timeouts so it fails fast instead of hanging
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  };

  console.log('📧 [Email] SMTP Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user
      ? `${String(config.auth.user).substring(0, 3)}***`
      : 'MISSING',
    passwordSet: !!config.auth.pass,
    passwordLength: config.auth.pass ? String(config.auth.pass).length : 0,
  });

  return nodemailer.createTransport(config);
};

/* ═══════════════════════════════════════════
   LOAD TEMPLATE (with multiple fallback paths)
   ═══════════════════════════════════════════ */
const loadTemplate = (
  templateName: string,
  data: Record<string, any>
): string => {
  const possiblePaths = [
    // When running from dist/services/
    path.join(__dirname, '../templates/emails', `${templateName}.html`),
    path.join(__dirname, '../../templates/emails', `${templateName}.html`),
    // When running from root
    path.join(process.cwd(), 'templates/emails', `${templateName}.html`),
    path.join(process.cwd(), 'dist/templates/emails', `${templateName}.html`),
    path.join(process.cwd(), 'src/templates/emails', `${templateName}.html`),
  ];

  console.log('📧 [Email] Loading template:', templateName);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        console.log('   ✅ Found template at:', p);
        const content = fs.readFileSync(p, 'utf8');
        const template = handlebars.compile(content);
        return template(data);
      } catch (err) {
        console.warn('   ⚠️ Compile failed:', err);
      }
    }
  }

  console.warn('   ⚠️ Template NOT found. Using fallback HTML.');
  return getFallbackHtml(data);
};

/* ═══════════════════════════════════════════
   FALLBACK HTML
   ═══════════════════════════════════════════ */
const getFallbackHtml = (data: Record<string, any>): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #0f0f1a; color: #fff; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; border-radius: 16px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #fbbf24; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { color: #fbbf24; margin: 0; }
    .code { font-size: 36px; font-weight: bold; color: #fbbf24; text-align: center; letter-spacing: 8px; padding: 20px; background: #0f0f1a; border-radius: 12px; margin: 20px 0; }
    p { color: #fff; line-height: 1.6; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #333; font-size: 12px; color: #888; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🏀 Playground League</h1></div>
    <h2 style="color:#fff;">Hello ${data.name || 'Athlete'}!</h2>
    <p>Your verification code is:</p>
    <div class="code">${data.code || '------'}</div>
    <p>This code expires in 15 minutes.</p>
    <p>If you didn't request this, please ignore this email.</p>
    <div class="footer">© ${data.year || new Date().getFullYear()} Playground League</div>
  </div>
</body>
</html>
`;

/* ═══════════════════════════════════════════
   VERIFY SMTP CONNECTION (optional — call on startup)
   ═══════════════════════════════════════════ */
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    console.log('📧 [Email] Verifying SMTP connection...');
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ [Email] SMTP connection is READY');
    return true;
  } catch (error: any) {
    console.error('❌ [Email] SMTP connection FAILED');
    console.error('   Code:', error?.code);
    console.error('   Message:', error?.message);
    console.error('   Command:', error?.command);
    return false;
  }
};

/* ═══════════════════════════════════════════
   SEND EMAIL
   ═══════════════════════════════════════════ */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  const start = Date.now();

  try {
    console.log('\n📧 [Email] Sending...');
    console.log('   To:', options.to);
    console.log('   Subject:', options.subject);
    console.log('   Template:', options.template);

    // ✅ Validate env
    if (!process.env.SMTP_USER) {
      console.error('❌ [Email] SMTP_USER missing in .env');
      return false;
    }
    if (!process.env.SMTP_PASSWORD) {
      console.error('❌ [Email] SMTP_PASSWORD missing in .env');
      return false;
    }

    const transporter = createTransporter();
    const html = loadTemplate(options.template, options.data);

    const info = await transporter.sendMail({
      from: `"Playground League" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    const ms = Date.now() - start;
    console.log(`✅ [Email] Sent in ${ms}ms`);
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', JSON.stringify(info.accepted));
    console.log('   Rejected:', JSON.stringify(info.rejected));

    return true;

  } catch (error: any) {
    const ms = Date.now() - start;
    console.error(`❌ [Email] FAILED after ${ms}ms`);
    console.error('   Code:', error?.code);
    console.error('   Message:', error?.message);
    console.error('   Command:', error?.command);
    console.error('   Response code:', error?.responseCode);
    console.error('   Response:', error?.response);

    // ✅ Helpful diagnosis
    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      console.error('\n⚠️ DIAGNOSIS: Gmail rejected the password.');
      console.error('   → Use a Gmail App Password (16 chars, no spaces)');
      console.error('   → 2-Step Verification must be ON');
    } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET') {
      console.error('\n⚠️ DIAGNOSIS: Connection timeout (port likely blocked).');
    } else if (error?.code === 'EENVELOPE') {
      console.error('\n⚠️ DIAGNOSIS: Invalid recipient / sender address.');
    }

    return false;
  }
};