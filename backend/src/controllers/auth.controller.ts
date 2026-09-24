// controllers/auth.controller.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateVerificationCode } from '../utils/verification';
import { sendEmail } from '../services/emailService';
import crypto from 'crypto';
import pool from '../config/database';
import { athleteService } from '../services/athlete.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { StreakService } from '../services/streak.service';
import { getIO } from '../socket/socketManager';
/* ═══════════════════════════════════════════
   CRYPTO-SECURE 8-CHARACTER PASSWORD GENERATOR
   (Placed OUTSIDE the class, before it)
   ═══════════════════════════════════════════ */
function generateRandomPassword(length: number = 8): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I, O
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // No l, o
  const numbers = '23456789'; // No 0, 1
  const symbols = '!@#$%&*';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least 1 char of each type
  const guaranteed: string[] = [
    uppercase.charAt(crypto.randomInt(0, uppercase.length)),
    lowercase.charAt(crypto.randomInt(0, lowercase.length)),
    numbers.charAt(crypto.randomInt(0, numbers.length)),
    symbols.charAt(crypto.randomInt(0, symbols.length)),
  ];

  // Fill remaining slots
  const remaining: string[] = [];
  for (let i = guaranteed.length; i < length; i++) {
    remaining.push(allChars.charAt(crypto.randomInt(0, allChars.length)));
  }

  // Fisher-Yates shuffle (crypto-secure)
  const combined = [...guaranteed, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}
export class AuthController {

  async register(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        password,
        handle,
        avatar,
        role,
        schoolOrLeague,
        primarySport,
        position,
        jerseyNumber,
        registeredState,
        registeredCity,
        referredByCode,
      } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Name, email, and password are required'
        });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
        return;
      }

      const existingUser = await athleteService.getAthleteByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      const userHandle = handle || `@${name.toLowerCase().replace(/\s+/g, '')}`;
      const existingHandle = await athleteService.getAthleteByHandle(userHandle);
      if (existingHandle) {
        res.status(409).json({
          success: false,
          message: 'This handle is already taken'
        });
        return;
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAthlete = await athleteService.createAthlete({
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        handle: userHandle,
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        role: role || 'high_school',
        schoolOrLeague: schoolOrLeague || '',
        primarySport: primarySport || 'basketball',
        position: position || '',
        jerseyNumber: jerseyNumber || 7,
        registeredState: registeredState || 'NY',
        registeredCity: registeredCity || 'New York',
        emailVerified: false,
        isVerified: false,
        isPro: false,
        isVerifiedPro: false,
        subscriptionTier: 'free',
        level: 1,
        referredByCode: referredByCode || undefined,
      });

      const token = jwt.sign(
        {
          id: newAthlete.id,
          email: newAthlete.email,
          name: newAthlete.name,
          role: newAthlete.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const { password: _, ...athleteWithoutPassword } = newAthlete;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          athlete: athleteWithoutPassword,
          token
        }
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Registration failed'
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    /* ═══════════════════════════════════════════
       1. INPUT VALIDATION
       ═══════════════════════════════════════════ */
    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
      return;
    }

    /* ═══════════════════════════════════════════
       2. FETCH ATHLETE
       ═══════════════════════════════════════════ */
    const athlete = await athleteService.getAthleteByEmail(
      email.toLowerCase()
    );

    if (!athlete) {
      res.status(401).json({
        success: false,
        message: 'No account found with this email. Please register first.',
      });
      return;
    }

    /* ═══════════════════════════════════════════
       3. ✅ ACCOUNT STATUS CHECK (SUSPENDED / BANNED)
       ═══════════════════════════════════════════ */
    const accountStatus = (athlete as any).account_status || 'active';

    if (accountStatus === 'suspended') {
      res.status(403).json({
        success: false,
        message:
          '🚫 Your account has been temporarily suspended. Please contact support at support@playgroundleague.pro for more information.',
        code: 'ACCOUNT_SUSPENDED',
        status: 'suspended',
      });
      return;
    }

    if (accountStatus === 'banned') {
      res.status(403).json({
        success: false,
        message:
          '🚫 Your account has been permanently banned due to violation of our community guidelines. Contact legal@playgroundleague.pro for appeals.',
        code: 'ACCOUNT_BANNED',
        status: 'banned',
      });
      return;
    }

    /* ═══════════════════════════════════════════
       4. PASSWORD CHECK
       ═══════════════════════════════════════════ */
    if (!athlete.password) {
      res.status(401).json({
        success: false,
        message: 'Account setup incomplete. Please contact support.',
      });
      return;
    }

    const storedPassword = String(athlete.password);
    const inputPassword = String(password);

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(inputPassword, storedPassword);
    } catch (compareError) {
      console.error('❌ bcrypt.compare error:', compareError);
      res.status(500).json({
        success: false,
        message: 'Error verifying password. Please try again.',
      });
      return;
    }

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.',
      });
      return;
    }

    /* ═══════════════════════════════════════════
       5. STREAK CHECK-IN (non-blocking)
       ═══════════════════════════════════════════ */
    let checkInResult: any = null;

    try {
      checkInResult = await StreakService.checkIn(athlete.id);

      if (!checkInResult.alreadyCheckedIn && checkInResult.xpAwarded > 0) {
        try {
          const io = getIO();
          if (io) {
            io.to(`user:${athlete.id}`).emit('notification:new', {
              id: `notif_checkin_${Date.now()}`,
              user_id: athlete.id,
              type: 'achievement',
              title: '🔥 Daily Check-in Complete!',
              message: `You earned +${checkInResult.xpAwarded} XP! Streak: ${
                checkInResult.newStreak
              } day${checkInResult.newStreak > 1 ? 's' : ''}.`,
              status: 'info',
              is_read: 0,
              created_at: new Date().toISOString(),
            });
            console.log('📡 [login] Check-in notification emitted');
          }
        } catch (socketErr) {
          console.warn('⚠️ Socket emit failed:', socketErr);
        }
      }
    } catch (checkInErr) {
      // Non-blocking
    }

    /* ═══════════════════════════════════════════
       6. JWT TOKEN
       ═══════════════════════════════════════════ */
    const token = jwt.sign(
      {
        id: athlete.id,
        email: athlete.email,
        name: athlete.name,
        role: athlete.role,
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...athleteWithoutPassword } = athlete;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        athlete: athleteWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: (error as Error).message,
    });
  }
}

  async debugPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const athlete = await athleteService.getAthleteByEmail(email.toLowerCase());

      if (!athlete) {
        res.json({
          exists: false,
          message: 'User not found'
        });
        return;
      }

      let isPasswordValid = false;
      let error = null;

      if (password && athlete.password) {
        try {
          isPasswordValid = await bcrypt.compare(password, athlete.password);
        } catch (compareError) {
          error = (compareError as Error).message;
          console.error('🔍 DEBUG: bcrypt.compare error:', compareError);
        }
      }

      res.json({
        exists: true,
        athlete: {
          id: athlete.id,
          email: athlete.email,
          name: athlete.name,
          hasPassword: !!athlete.password,
          passwordLength: athlete.password?.length || 0,
          passwordFirstChars: athlete.password ? athlete.password.substring(0, 20) : 'null',
          isPasswordValid: isPasswordValid,
          compareError: error
        }
      });

    } catch (error) {
      console.error('❌ Debug error:', error);
      res.status(500).json({
        error: (error as Error).message
      });
    }
  }

  async verifyToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided'
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret_key'
    ) as jwt.JwtPayload;

    const athlete = await athleteService.getAthleteById(decoded.id);

    if (!athlete) {
      res.status(404).json({
        success: false,
        message: 'Athlete not found'
      });
      return;
    }

    /* ═══════════════════════════════════════════
       ✅ ADDED: CHECK ACCOUNT STATUS (SUSPENDED / BANNED)
       Nothing removed, only added this block.
       ═══════════════════════════════════════════ */
    const accountStatus =
      (athlete as any).account_status ||
      (athlete as any).accountStatus ||
      'active';

    if (accountStatus === 'suspended') {
      res.status(403).json({
        success: false,
        message:
          '🚫 Your account has been temporarily suspended. Please contact support at support@playgroundleague.pro for more information.',
        code: 'ACCOUNT_SUSPENDED',
        status: 'suspended',
      });
      return;
    }

    if (accountStatus === 'banned') {
      res.status(403).json({
        success: false,
        message:
          '🚫 Your account has been permanently banned due to violation of our community guidelines. Contact legal@playgroundleague.pro for appeals.',
        code: 'ACCOUNT_BANNED',
        status: 'banned',
      });
      return;
    }
    /* ═══════════════════════════════════════════
       END: ACCOUNT STATUS CHECK
       ═══════════════════════════════════════════ */

    const { password: _, ...athleteWithoutPassword } = athlete;

    res.status(200).json({
      success: true,
      data: {
        athlete: athleteWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('❌ Token verification error:', error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
}

  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const athlete = await athleteService.getAthleteById(userId);

      if (!athlete) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      const { password: _, ...athleteWithoutPassword } = athlete;

      res.status(200).json({
        success: true,
        data: {
          athlete: athleteWithoutPassword
        }
      });

    } catch (error) {
      console.error('❌ Get current user error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Failed to get user info'
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Logout failed'
      });
    }
  }

  async oauthLogin(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'OAuth login not implemented yet'
    });
  }

  // ═══════════════════════════════════════════
  // EMAIL VERIFICATION METHODS
  // ═══════════════════════════════════════════

  /**
   * Send verification email with 6-digit code
   */
  async sendVerificationEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, name } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      const [athletes]: any = await pool.query(
        'SELECT id, name, email, email_verified FROM athletes WHERE email = ?',
        [email]
      );

      if (athletes.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Athlete not found. Please register first.'
        });
        return;
      }

      const athlete = athletes[0];

      if (athlete.email_verified) {
        res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
        return;
      }

      await pool.query(
        'UPDATE email_verifications SET is_used = true WHERE email = ? AND is_used = false',
        [email]
      );

      const code = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      await pool.query(
        `INSERT INTO email_verifications (athlete_id, email, code, expires_at, is_used)
         VALUES (?, ?, ?, ?, ?)`,
        [athlete.id, email, code, expiresAt, false]
      );

      // ✅ UPDATED: sendEmail returns EmailResult object
      const emailResult = await sendEmail({
        to: email,
        subject: 'Verify Your Email - Playground League',
        template: 'verification',
        data: {
          name: athlete.name || name || 'Athlete',
          code: code,
          year: new Date().getFullYear()
        }
      });

      if (!emailResult.success) {
        console.error('❌ Email failed:', emailResult.code, emailResult.error);
        res.status(500).json({
          success: false,
          message: 'Failed to send verification email',
          error: emailResult.error,
          code: emailResult.code,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Verification code sent successfully',
        messageId: emailResult.messageId,
        data: {
          verificationCode: code // Only for development, remove in production
        }
      });

    } catch (error) {
      console.error('❌ Send verification email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Verify email with 6-digit code
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        res.status(400).json({
          success: false,
          message: 'Email and verification code are required'
        });
        return;
      }

      if (!/^\d{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          message: 'Invalid verification code format. Please enter a 6-digit code.'
        });
        return;
      }

      const [records]: any = await pool.query(
        `SELECT * FROM email_verifications
         WHERE email = ? AND code = ? AND is_used = false
         ORDER BY created_at DESC LIMIT 1`,
        [email, code]
      );

      if (records.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
        return;
      }

      const record = records[0];

      if (new Date(record.expires_at) < new Date()) {
        await pool.query(
          'UPDATE email_verifications SET is_used = true WHERE id = ?',
          [record.id]
        );
        res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.'
        });
        return;
      }

      await pool.query(
        'UPDATE email_verifications SET is_used = true WHERE id = ?',
        [record.id]
      );

      await pool.query(
        'UPDATE athletes SET email_verified = true WHERE id = ?',
        [record.athlete_id]
      );

      let checkInResult: any = null;

      try {
        checkInResult = await StreakService.checkIn(record.athlete_id);

        if (!checkInResult.alreadyCheckedIn && checkInResult.xpAwarded > 0) {
          try {
            const io = getIO();
            if (io) {
              io.to(`user:${record.athlete_id}`).emit('notification:new', {
                id: `notif_checkin_${Date.now()}`,
                user_id: record.athlete_id,
                type: 'achievement',
                title: '🔥 Daily Check-in Complete!',
                message: `You earned +${checkInResult.xpAwarded} XP! Streak: ${checkInResult.newStreak} day${
                  checkInResult.newStreak > 1 ? 's' : ''
                }.`,
                status: 'info',
                is_read: 0,
                created_at: new Date().toISOString(),
              });
              console.log('📡 [verify-email] Check-in notification emitted');
            }
          } catch (socketErr) {
            console.warn('⚠️ Socket emit failed:', socketErr);
          }
        }
      } catch (checkInErr) {
        console.error('⚠️ [verify-email] Auto check-in failed (non-blocking):', checkInErr);
      }

      const [athletes]: any = await pool.query(
        `SELECT id, name, email, userhandle, profilepicture, role,
                email_verified, is_pro, level,
                primary_sport, school, leaguebracket, position, jersey
         FROM athletes WHERE id = ?`,
        [record.athlete_id]
      );

      if (athletes.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Athlete not found'
        });
        return;
      }

      const athlete = athletes[0];

      const { password: _, ...athleteWithoutPassword } = athlete;

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: {
          athlete: athleteWithoutPassword,
          verified: true
        }
      });

    } catch (error) {
      console.error('❌ Verify email error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify email'
      });
    }
  }

  /**
   * Resend verification code
   */
  async resendVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      const [athletes]: any = await pool.query(
        'SELECT id, name, email, email_verified FROM athletes WHERE email = ?',
        [email]
      );

      if (athletes.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Athlete not found'
        });
        return;
      }

      const athlete = athletes[0];

      if (athlete.email_verified) {
        res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
        return;
      }

      await pool.query(
        'UPDATE email_verifications SET is_used = true WHERE email = ? AND is_used = false',
        [email]
      );

      const code = generateVerificationCode();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      await pool.query(
        `INSERT INTO email_verifications (athlete_id, email, code, expires_at, is_used)
         VALUES (?, ?, ?, ?, ?)`,
        [athlete.id, email, code, expiresAt, false]
      );

      // ✅ UPDATED: sendEmail returns EmailResult object
      const emailResult = await sendEmail({
        to: email,
        subject: 'Resend: Verify Your Email - Playground League',
        template: 'verification',
        data: {
          name: athlete.name || 'Athlete',
          code: code,
          year: new Date().getFullYear()
        }
      });

      if (!emailResult.success) {
        console.error('❌ Email failed:', emailResult.code, emailResult.error);
        res.status(500).json({
          success: false,
          message: 'Failed to send verification email',
          error: emailResult.error,
          code: emailResult.code,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'New verification code sent successfully',
        messageId: emailResult.messageId,
        data: {
          verificationCode: code // Only for development, remove in production
        }
      });

    } catch (error) {
      console.error('❌ Resend verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend verification code',
        error: (error as Error).message,
      });
    }
  }

  /**
   * Check if email is verified
   */
  async checkEmailVerified(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      const [athletes]: any = await pool.query(
        'SELECT id, email, email_verified FROM athletes WHERE email = ?',
        [email]
      );

      if (athletes.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Athlete not found'
        });
        return;
      }

      const athlete = athletes[0];

      res.status(200).json({
        success: true,
        data: {
          verified: athlete.email_verified === 1,
          athlete: {
            id: athlete.id,
            email: athlete.email,
            emailVerified: athlete.email_verified === 1
          }
        }
      });

    } catch (error) {
      console.error('❌ Check email verified error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check email verification status'
      });
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    /* ═══════════════════════════════════════════
       1. VALIDATE EMAIL
       ═══════════════════════════════════════════ */
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required',
      });
      return;
    }

    /* ═══════════════════════════════════════════
       2. FETCH ATHLETE
       ═══════════════════════════════════════════ */
    const [athletes]: any = await pool.query(
      'SELECT id, name, email, account_status FROM athletes WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (athletes.length === 0) {
      // For security, don't reveal if email exists
      res.status(200).json({
        success: true,
        message:
          'If an account exists with this email, a new password has been sent.',
      });
      return;
    }

    const athlete = athletes[0];

    /* ═══════════════════════════════════════════
       3. CHECK ACCOUNT STATUS
       ═══════════════════════════════════════════ */
    if (athlete.account_status === 'suspended') {
      res.status(403).json({
        success: false,
        message:
          '🚫 Your account is suspended. Please contact support at support@playgroundleague.pro',
      });
      return;
    }

    if (athlete.account_status === 'banned') {
      res.status(403).json({
        success: false,
        message:
          '🚫 Your account has been permanently banned.',
      });
      return;
    }

    /* ═══════════════════════════════════════════
       4. AUTO-GENERATE 8-CHARACTER PASSWORD
       ═══════════════════════════════════════════ */
    const newPassword = generateRandomPassword(8);

    // Hash it
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    /* ═══════════════════════════════════════════
       5. SAVE TO DATABASE
       ═══════════════════════════════════════════ */
    await pool.query(
      `UPDATE athletes 
       SET password = ?, 
           reset_password_token = NULL, 
           reset_password_expires = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, athlete.id]
    );

    /* ═══════════════════════════════════════════
       6. SEND EMAIL WITH NEW PASSWORD
       ═══════════════════════════════════════════ */
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    const emailResult = await sendEmail({
      to: email,
      subject: '🔐 Your New Password - Playground League',
      template: 'password-reset',
      data: {
        name: athlete.name || 'Athlete',
        newPassword: newPassword,
        loginLink: loginLink,
        year: new Date().getFullYear(),
      },
    });

    if (!emailResult.success) {
      console.error('❌ Email failed:', emailResult.code, emailResult.error);
      res.status(500).json({
        success: false,
        message: 'Failed to send password reset email',
        error: emailResult.error,
        code: emailResult.code,
      });
      return;
    }

    console.log(
      `✅ New password generated for ${email}: ${newPassword} (also emailed)`
    );

    res.status(200).json({
      success: true,
      message: 'A new password has been sent to your email address.',
      messageId: emailResult.messageId,
    });
  } catch (error) {
    console.error('❌ Send password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email',
      error: (error as Error).message,
    });
  }
}


  async refreshToken(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      message: 'Token refresh not implemented yet'
    });
  }
}