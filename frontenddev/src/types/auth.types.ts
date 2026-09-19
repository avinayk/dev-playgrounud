// types/auth.types.ts
export type SportType = 'basketball' | 'baseball' | 'softball' | 'pickleball' | 'soccer' | 'volleyball' | 'football' | 'tennis';
export type UserLevel = 'high_school' | 'college' | 'playground_pro' | 'scout_recruiter';

export interface AthleteProfile {
  id: string;
  name: string;
  handle: string;
  email: string;
  password?: string;
  avatar: string;
  role: UserLevel;
  schoolOrLeague: string;
  primarySport: SportType;
  position: string;
  valuexp?: number; 
  jerseyNumber: number;
  registeredState: string;
  registeredCity: string;
  hasCompletedLocationOnboarding: boolean;
  bio: string;
  emailVerified: boolean;
  isVerified: boolean;
  isPro: boolean;
  isVerifiedPro: boolean;
  subscriptionTier: 'free' | 'pro' | 'scout';
  level: number;
  // ✅ Referral fields
  referralCode?: string;
  referral_code?: string;
  referredByCode?: string;
  referred_by_code?: string;
  referralStats?: {
    sent: number;
    joined: number;
    earned: number;
  };
  isScout?: boolean;
  isVerifiedScout?: boolean;
  scoutPassActive?: boolean;
  scoutOrgName?: string;
}

export interface AuthProviderSettings {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  appleEnabled: boolean;
  allowedEmailDomains?: string[];
  providerOrder?: string[];
}

export interface RegisterResult {
  success: boolean;
  athlete?: AthleteProfile;
  error?: string;
}

export interface LoginResult {
  success: boolean;
  athlete?: AthleteProfile;
  error?: string;
}

export interface ValidateResult {
  allowed: boolean;
  athlete?: AthleteProfile;
}