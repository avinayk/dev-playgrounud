// services/authService.ts
import { AthleteProfile, RegisterResult, LoginResult, ValidateResult, SportType, UserLevel } from '../types/auth.types';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Token management
const TOKEN_KEY = 'playground_auth_token';
const USER_KEY = 'playground_user';

export const authService = {
  // Register new athlete
  register: async (profile: Partial<AthleteProfile>): Promise<RegisterResult> => {
    try {
      // Validate required fields
      if (!profile.name || !profile.email || !profile.password) {
        return {
          success: false,
          error: 'Name, email, and password are required fields.'
        };
      }

      // Prepare athlete data for API
      const athleteData = {
        name: profile.name.trim(),
        handle: profile.handle || `@${profile.name.toLowerCase().replace(/\s+/g, '')}`,
        email: profile.email.trim().toLowerCase(),
        password: profile.password,
        avatar: profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        role: profile.role || 'high_school',
        schoolOrLeague: profile.schoolOrLeague || '',
        primarySport: profile.primarySport || 'basketball',
        position: profile.position || '',
        jerseyNumber: profile.jerseyNumber || 7,
        registeredState: profile.registeredState || 'NY',
        registeredCity: profile.registeredCity || 'New York',
        emailVerified: false,
        isVerified: false,
        isPro: false,
        isVerifiedPro: false,
        subscriptionTier: 'free',
        level: 1,
        isScout: profile.role === 'scout_recruiter' ? true : false,
        isVerifiedScout: false,
        scoutPassActive: false, 
        referredByCode: (profile as any).referredByCode || null,
        scoutOrgName: profile.role === 'scout_recruiter' ? profile.scoutOrgName || 'NCAA / FIBA Scouting Network' : null
      };
 
 
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(athleteData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Registration failed');
      }

      const { athlete, token } = data.data;
      
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(athlete));
      }
 

      return {
        success: true,
        athlete
      };

    } catch (error: any) {
      console.error('[authService] Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please try again.'
      };
    }
  },

  // Login with email and password
  login: async (credentials: { email: string; password: string }): Promise<LoginResult> => {
    try {
      if (!credentials.email || !credentials.password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

 

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Login failed');
      }

      const { athlete, token } = data.data;
      
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(athlete));
 

      return {
        success: true,
        athlete
      };

    } catch (error: any) {
      console.error('[authService] Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please try again.'
      };
    }
  },

  // Verify current token
  verifyToken: async (): Promise<{ valid: boolean; athlete?: AthleteProfile }> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        return { valid: false };
      }

      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return { valid: false };
      }

      const athlete = data.data?.athlete;
      if (athlete) {
        localStorage.setItem(USER_KEY, JSON.stringify(athlete));
      }

      return {
        valid: true,
        athlete
      };

    } catch (error) {
      console.error('[authService] Token verification error:', error);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { valid: false };
    }
  },

  // Get current user from localStorage
  getCurrentUser: (): AthleteProfile | null => {
    try {
      const userData = localStorage.getItem(USER_KEY);
      if (!userData) return null;
      return JSON.parse(userData);
    } catch (error) {
      console.error('[authService] Error getting current user:', error);
      return null;
    }
  },

  // Get auth token
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // Logout
  logout: async (): Promise<void> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('[authService] Logout error:', error);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  // Validate athlete exists (for OAuth)
  validateAthlete: async (email: string): Promise<ValidateResult> => {
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      const response = await fetch(`${API_BASE_URL}/athletes/email/${encodeURIComponent(trimmedEmail)}`);
      
      if (!response.ok) {
        return { allowed: false };
      }

      const athleteData = await response.json();
      
      const athlete: AthleteProfile = {
        id: athleteData.id,
        name: athleteData.name,
        handle: athleteData.handle || '',
        email: athleteData.email,
        avatar: athleteData.avatar || '',
        role: athleteData.role || 'high_school',
        schoolOrLeague: athleteData.school_or_league || '',
        primarySport: athleteData.primary_sport || 'basketball',
        position: athleteData.position || '',
        jerseyNumber: athleteData.jersey_number || 7,
        registeredState: athleteData.registered_state || 'NY',
        registeredCity: athleteData.registered_city || 'New York',
        hasCompletedLocationOnboarding: athleteData.has_completed_location_onboarding || false,
        bio: athleteData.bio || '',
        emailVerified: athleteData.email_verified || false,
        isVerified: athleteData.is_verified || false,
        isPro: athleteData.is_pro || false,
        isVerifiedPro: athleteData.is_verified_pro || false,
        subscriptionTier: athleteData.subscription_tier || 'free',
        level: athleteData.level || 1,
        isScout: athleteData.is_scout || false,
        isVerifiedScout: athleteData.is_verified_scout || false,
        scoutPassActive: athleteData.scout_pass_active || false,
        scoutOrgName: athleteData.scout_org_name || undefined,
      };

      return {
        allowed: true,
        athlete
      };

    } catch (error) {
      console.error('[authService] Validate error:', error);
      return { allowed: false };
    }
  },

  // ============================================
  // EMAIL VERIFICATION METHODS
  // ============================================

  /**
   * Send verification email with 6-digit code
   */
  sendVerificationCode: async (email: string, name: string): Promise<{ 
    success: boolean; 
    error?: string; 
    verificationCode?: string 
  }> => {
    try {
   
      
      const response = await fetch(`${API_BASE_URL}/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification email');
      }

    

      return {
        success: true,
        verificationCode: data.data?.verificationCode || data.verificationCode
      };
      
    } catch (error: any) {
      console.error('[authService] Verification email error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send verification email.'
      };
    }
  },

  /**
   * Verify email with 6-digit code
   */
  verifyEmailCode: async (email: string, code: string): Promise<{
    success: boolean;
    message?: string;
    athlete?: AthleteProfile;
    error?: string;
  }> => {
    try {
      if (!email || !code) {
        return {
          success: false,
          error: 'Email and verification code are required'
        };
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return {
          success: false,
          error: 'Invalid verification code format. Please enter a 6-digit code.'
        };
      }

     

      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          code: code.trim() 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      if (!data.success) {
        throw new Error(data.message || 'Verification failed');
      }

      // Update local user data if athlete is returned
      if (data.data?.athlete) {
        const updatedAthlete = data.data.athlete;
        // Update the stored user data
        const currentUser = localStorage.getItem(USER_KEY);
        if (currentUser) {
          const userData = JSON.parse(currentUser);
          userData.emailVerified = true;
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
        }
        // Also update if athlete is provided directly
        localStorage.setItem(USER_KEY, JSON.stringify(updatedAthlete));
      }

    

      return {
        success: true,
        message: data.message || 'Email verified successfully',
        athlete: data.data?.athlete
      };

    } catch (error: any) {
      console.error('[authService] Verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify email. Please try again.'
      };
    }
  },

  /**
   * Resend verification code
   */
  resendVerificationCode: async (email: string): Promise<{
    success: boolean;
    message?: string;
    verificationCode?: string;
    error?: string;
  }> => {
    try {
      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        };
      }

    

      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification code');
      }
 

      return {
        success: true,
        message: data.message || 'New verification code sent',
        verificationCode: data.data?.verificationCode || data.verificationCode
      };

    } catch (error: any) {
      console.error('[authService] Resend verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to resend verification code.'
      };
    }
  },

  /**
   * Check if email is verified
   */
  checkEmailVerified: async (email: string): Promise<{
    verified: boolean;
    athlete?: AthleteProfile;
  }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-verified/${encodeURIComponent(email.trim().toLowerCase())}`);
      
      if (!response.ok) {
        return { verified: false };
      }

      const data = await response.json();
      
      return {
        verified: data.data?.verified || false,
        athlete: data.data?.athlete
      };

    } catch (error) {
      console.error('[authService] Check email verified error:', error);
      return { verified: false };
    }
  },

  /**
   * Send password reset email
   */
  sendPasswordResetEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }

      return {
        success: true,
        message: data.message || 'Password reset email sent'
      };

    } catch (error: any) {
      console.error('[authService] Password reset error:', error);
      return {
        success: false,
        message: error.message || 'Failed to send reset email'
      };
    }
  }
};

// API service for welcome emails and other utilities
export const api = {
  sendWelcomeEmail: async (
    email: string, 
    name: string, 
    sport: SportType, 
    isPro: boolean
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/welcome-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name, sport, isPro }),
      });

      if (!response.ok) {
        console.warn('[api] Welcome email failed:', await response.text());
      }
      
    } catch (error) {
      console.warn('[api] Welcome email error:', error);
    }
  },

  validateEmailDomain: (email: string, allowedDomains: string[]): boolean => {
    if (!allowedDomains || allowedDomains.length === 0) return true;
    
    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? allowedDomains.includes(domain) : false;
  }
};


export const referralApi = {
  getReferralCode: async (athleteId: string): Promise<{ success: boolean; referralCode?: string }> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}/athletes/${athleteId}/referral-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      return { success: true, referralCode: data.data?.referralCode };
    } catch (err) {
      console.error('[referralApi] getReferralCode:', err);
      return { success: false };
    }
  },

  getReferralStats: async (athleteId: string): Promise<{
    success: boolean;
    stats?: { sent: number; joined: number; earned: number };
  }> => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}/athletes/${athleteId}/referrals/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);
      return { success: true, stats: data.data };
    } catch (err) {
      console.error('[referralApi] getReferralStats:', err);
      return { success: false };
    }
  },

  sendReferralEmail: async (athleteId: string, email: string, link: string) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE_URL}/referrals/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ athleteId, email, link }),
      });
      return await res.json();
    } catch (err) {
      console.error('[referralApi] sendReferralEmail:', err);
      return { success: false };
    }
  },
};