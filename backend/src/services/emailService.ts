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

interface EmailResult {
  success: boolean;
  error?: string;
  code?: string;
  messageId?: string;
}

const createTransporter = () => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;

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

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secureFromEnv = process.env.SMTP_SECURE;
  const secure =
    secureFromEnv === 'true' ? true : secureFromEnv === 'false' ? false : port === 465;

  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    logger: true,
    debug: true,
  };

  console.log('📧 [Email] SMTP Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user ? `${String(config.auth.user).substring(0, 3)}***` : 'MISSING',
    passwordSet: !!config.auth.pass,
    passwordLength: config.auth.pass ? String(config.auth.pass).length : 0,
  });

  return nodemailer.createTransport(config);
};

const loadTemplate = (templateName: string, data: Record<string, any>): string => {
  const possiblePaths = [
    path.join(__dirname, '../templates/emails', `${templateName}.html`),
    path.join(__dirname, '../../templates/emails', `${templateName}.html`),
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

const getFallbackHtml = (data: Record<string, any>): string => `
<!DOCTYPE html>
<html><body style="font-family:Arial;background:#0f0f1a;color:#fff;padding:40px;">
  <h1 style="color:#fbbf24;">🏀 Playground League</h1>
  <h2>Hello ${data.name || 'Athlete'}!</h2>
  <p>Your verification code is:</p>
  <div style="font-size:36px;font-weight:bold;color:#fbbf24;letter-spacing:8px;padding:20px;background:#1a1a2e;border-radius:12px;text-align:center;">
    ${data.code || '------'}
  </div>
  <p>This code expires in 15 minutes.</p>
</body></html>
`;

export const sendEmail = async (options: EmailOptions): Promise<EmailResult> => {
  const start = Date.now();

  try {
    console.log('\n📧 [Email] Sending...');
    console.log('   To:', options.to);
    console.log('   Subject:', options.subject);
    console.log('   Template:', options.template);

    if (!process.env.SMTP_USER) {
      const err = 'SMTP_USER missing in .env';
      console.error('❌ [Email]', err);
      return { success: false, error: err, code: 'ENV_MISSING_USER' };
    }
    if (!process.env.SMTP_PASSWORD) {
      const err = 'SMTP_PASSWORD missing in .env';
      console.error('❌ [Email]', err);
      return { success: false, error: err, code: 'ENV_MISSING_PASSWORD' };
    }

    const transporter = createTransporter();
    const html = loadTemplate(options.template, options.data);

    const info = await transporter.sendMail({
      from: `"Playground League" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      html,
    });

    const ms = Date.now() - start;
    console.log(`✅ [Email] Sent in ${ms}ms`);
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);

    return { success: true, messageId: info.messageId };

  } catch (error: any) {
    const ms = Date.now() - start;
    console.error(`❌ [Email] FAILED after ${ms}ms`);
    console.error('   Code:', error?.code);
    console.error('   Message:', error?.message);
    console.error('   Command:', error?.command);
    console.error('   Response:', error?.response);

    let userMessage = error?.message || 'Unknown email error';
    let errCode = error?.code || 'UNKNOWN';

    if (error?.code === 'EAUTH' || error?.responseCode === 535) {
      userMessage = 'Gmail authentication failed. Check SMTP_USER and SMTP_PASSWORD (must be App Password).';
      errCode = 'EAUTH';
    } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ESOCKET') {
      userMessage = 'SMTP connection timeout. Port may be blocked or SMTP_HOST wrong.';
      errCode = 'ETIMEDOUT';
    } else if (error?.code === 'EENVELOPE') {
      userMessage = 'Invalid email address. Check SMTP_FROM and "to" field.';
      errCode = 'EENVELOPE';
    } else if (error?.code === 'EDNS') {
      userMessage = `DNS resolution failed for ${process.env.SMTP_HOST}`;
      errCode = 'EDNS';
    } else if (error?.code === 'ECONNECTION' || error?.code === 'ECONNREFUSED') {
      userMessage = `Cannot connect to SMTP server ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`;
      errCode = 'ECONNECTION';
    }

    return { success: false, error: userMessage, code: errCode };
  }
};
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
   ACCOUNT STATUS EMAIL HELPER
   ═══════════════════════════════════════════ */
export type AccountStatus = 'active' | 'suspended' | 'banned';

interface StatusEmailPayload {
  to: string;
  athleteName: string;
  userHandle: string;
  status: AccountStatus;
  reason?: string;
}

const STATUS_CONFIG: Record<
  AccountStatus,
  {
    emoji: string;
    title: string;
    label: string;
    barColor: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    accent: string;
    intro: string;
    details: string;
    alert: string;
    ctaText?: string;
    ctaLink?: string;
    subject: string;
  }
> = {
  active: {
    emoji: '✅',
    title: 'Account Reactivated',
    label: 'ACTIVE',
    barColor: 'linear-gradient(90deg,#a3e635 0%,#84cc16 100%)',
    badgeBg: 'rgba(163,230,53,0.15)',
    badgeBorder: 'rgba(163,230,53,0.4)',
    badgeText: '#a3e635',
    accent: '#a3e635',
    intro:
      'Great news! Your Playground League account has been <strong style="color:#a3e635;">reactivated</strong>. You now have full access to the platform again.',
    details:
      'You can now log back in, join pickup games, upload highlights, and connect with other athletes. Welcome back to the court! 🏀',
    alert: '⚡ Your account is fully active — go ball out!',
    ctaText: '🏀 Back to Playground',
    ctaLink: 'https://playgroundleague.pro',
    subject: '✅ Your Playground League Account is Active Again',
  },
  suspended: {
    emoji: '⚠️',
    title: 'Account Suspended',
    label: 'SUSPENDED',
    barColor: 'linear-gradient(90deg,#facc15 0%,#f97316 100%)',
    badgeBg: 'rgba(250,204,21,0.15)',
    badgeBorder: 'rgba(250,204,21,0.4)',
    badgeText: '#facc15',
    accent: '#facc15',
    intro:
      'Your Playground League account has been <strong style="color:#facc15;">temporarily suspended</strong> by our moderation team.',
    details:
      'While suspended, you will be unable to join games, post highlights, or interact with other athletes. This is typically a temporary measure.',
    alert: '⏳ If you believe this was a mistake, contact support@playgroundleague.pro',
    ctaText: '📧 Contact Support',
    ctaLink: 'mailto:support@playgroundleague.pro',
    subject: '⚠️ Your Playground League Account Has Been Suspended',
  },
  banned: {
    emoji: '🚫',
    title: 'Account Banned',
    label: 'BANNED',
    barColor: 'linear-gradient(90deg,#f97316 0%,#ef4444 100%)',
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeBorder: 'rgba(239,68,68,0.4)',
    badgeText: '#ef4444',
    accent: '#ef4444',
    intro:
      'Your Playground League account has been <strong style="color:#ef4444;">permanently banned</strong> due to a serious violation of our community guidelines.',
    details:
      'You no longer have access to the Playground League platform. All associated data may be removed in accordance with our policies.',
    alert: '🚫 This decision is final. Contact legal@playgroundleague.pro for appeals.',
    ctaText: '📧 Appeal Decision',
    ctaLink: 'mailto:legal@playgroundleague.pro',
    subject: '🚫 Your Playground League Account Has Been Banned',
  },
};

export const sendAccountStatusEmail = async (
  payload: StatusEmailPayload
): Promise<EmailResult> => {
  const config = STATUS_CONFIG[payload.status];

  const updatedAt = new Date().toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return sendEmail({
    to: payload.to,
    subject: config.subject,
    template: 'account-status-update',
    data: {
      athleteName: payload.athleteName,
      userHandle: payload.userHandle,
      statusTitle: config.title,
      statusLabel: config.label,
      statusEmoji: config.emoji,
      statusBarColor: config.barColor,
      badgeBgColor: config.badgeBg,
      badgeBorderColor: config.badgeBorder,
      badgeTextColor: config.badgeText,
      accentColor: config.accent,
      introMessage: config.intro,
      detailsMessage: config.details,
      alertMessage: config.alert,
      ctaText: config.ctaText || '',
      ctaLink: config.ctaLink || '',
      reason: payload.reason || '',
      updatedAt,
    },
  });
};