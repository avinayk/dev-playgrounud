import React, { useState, useEffect } from 'react';
import { StateCitySelector } from './StateCitySelector';
import { authService } from '../services/authService';
import { referralApi } from '../services/referralService';
import { 
  UserPlus, 
  LogIn, 
  ShieldCheck,   
  Sparkles, 
  Check, 
  Lock, 
  Mail, 
  User, 
  Camera, 
  Trophy, 
  Flame, 
  Zap, Gift,
  Film,
  Award,
  ArrowRight,
  X,
  Loader2,
  Key,
  AlertTriangle,
  ExternalLink,
  LifeBuoy,
  ShieldAlert,
  Info
} from 'lucide-react';
import { EmailVerifypopup } from './EmailVerifypopup';

// Types (these should be imported from your types file)
type SportType = 'basketball' | 'baseball' | 'softball' | 'pickleball' | 'soccer' | 'volleyball' | 'football' | 'tennis';
type UserLevel = 'high_school' | 'college' | 'playground_pro' | 'scout_recruiter';

interface AthleteProfile {
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
  jerseyNumber: number;
  registeredState: string;
  registeredCity: string;
  hasCompletedLocationOnboarding: boolean;
  bio: string;
  emailVerified: boolean;
  isVerified: boolean;
  isPro: boolean;
  isVerifiedPro: boolean;
  subscriptionTier: 'free' | 'pro' | 'elite';
  level: number;
  isScout?: boolean;
  isVerifiedScout?: boolean;
  scoutPassActive?: boolean;
  scoutOrgName?: string;
  profilepicture?: string;
  primary_sport?: string;
}

interface AuthProviderSettings {
  googleEnabled: boolean;
  facebookEnabled: boolean;
  appleEnabled: boolean;
  allowedEmailDomains?: string[];
  providerOrder?: string[];
}

interface PublicAuthViewProps {
  user: AthleteProfile | null;
  isAuthInitializing?: boolean;
  initialAuthMode?: 'register' | 'login';
  authProviderSettings?: AuthProviderSettings;
  onAuthModeChange?: (mode: 'register' | 'login') => void;
  onRegisterUser: (newUser: AthleteProfile) => void;
  onSelectDemoAccount: (athleteId: string) => void;
  onLoginSuccess: (providerName: string, email?: string) => void;
}

// Mock API for demonstration
const api = {
  sendWelcomeEmail: async (email: string, name: string, sport: SportType, isPro: boolean) => {
 
    return { success: true };
  }
};



export const PublicAuthView: React.FC<PublicAuthViewProps> = ({
  user,
  isAuthInitializing = false,
  initialAuthMode = 'register',
  authProviderSettings = { googleEnabled: false, facebookEnabled: false, appleEnabled: false },
  onAuthModeChange,
  onRegisterUser,
  onSelectDemoAccount,
  onLoginSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'login'>(initialAuthMode);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);
  const [showDomainGuideButton, setShowDomainGuideButton] = useState(false);
const [referralCode, setReferralCode] = useState<string>('');
  // Sub-Modals
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isDomainGuideOpen, setIsDomainGuideOpen] = useState(false);

  // Email verification state
  const [showVerificationPopup, setShowVerificationPopup] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);

 const pendingReferralCode = referralCode || localStorage.getItem('pending_referral_code') || undefined;

  const [invitedGameInfo, setInvitedGameInfo] = useState<{
    title: string;
    courtName: string;
    time: string;
    host: string;
  } | null>(null);

  // Registration state
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primarySport, setPrimarySport] = useState<SportType>('basketball');
  const [role, setRole] = useState<UserLevel>('high_school');
  const [schoolOrLeague, setSchoolOrLeague] = useState('');
  const [position, setPosition] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('7');
  const [registeredState, setRegisteredState] = useState('NY');
  const [registeredCity, setRegisteredCity] = useState('New York');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Loading states
  const [isRegistering, setIsRegistering] = useState(false);

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
  ];

  const [registerError, setRegisterError] = useState<string | null>(null);

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  const validateEmailDomainWhitelist = (email: string, allowedDomains?: string[]): { isValid: boolean; error?: string } => {
    if (!allowedDomains || allowedDomains.length === 0) {
      return { isValid: true };
    }

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      return { isValid: false, error: 'Invalid email format.' };
    }

    if (!allowedDomains.includes(domain)) {
      return { 
        isValid: false, 
        error: `Email domain "${domain}" is not allowed. Please use one of: ${allowedDomains.join(', ')}` 
      };
    }

    return { isValid: true };
  };

  const compressImageFile = async (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height / width) * maxWidth;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width / height) * maxHeight;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // ============================================
  // SEND VERIFICATION EMAIL
  // ============================================

  const sendVerificationEmailUtility = async (email: string, name: string) => {
    try {
      const result = await authService.sendVerificationCode(email, name);
      if (!result.success) {
        console.warn('Verification email notice:', result.error);
      }
      return result;
    } catch (error) {
      console.warn('Verification email error:', error);
      return { success: false };
    }
  };

  // ============================================
  // SEND WELCOME EMAIL
  // ============================================

  const sendWelcomeEmail = async (email: string, name: string, sport: SportType, isPro: boolean) => {
    try {
      await api.sendWelcomeEmail(email, name, sport, isPro);
    } catch (error) {
      console.warn('Welcome email error:', error);
    }
  };

  // ============================================
  // REGISTER HANDLER
  // ============================================

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setIsRegistering(true);
    
    // Validate all required fields
    if (!name.trim() || !email.trim() || !password.trim()) {
      setRegisterError('All fields including password are required');
      setIsRegistering(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setRegisterError('Password must be at least 6 characters long');
      setIsRegistering(false);
      return;
    }

    // Validate handle
    if (!handle.trim()) {
      setRegisterError('Please enter a unique handle');
      setIsRegistering(false);
      return;
    }

    // Email Domain Whitelist enforcement
    const domainCheck = validateEmailDomainWhitelist(email, authProviderSettings.allowedEmailDomains);
    if (!domainCheck.isValid) {
      setRegisterError(domainCheck.error || 'Email domain is restricted by administrator.');
      setIsRegistering(false);
      return;
    }

    const formattedHandle = handle.startsWith('@') ? handle : `@${handle.trim() || name.toLowerCase().replace(/\s+/g, '')}`;

    const newUserProfile: Partial<AthleteProfile> & { referredByCode?: string } = {
      name: name.trim(),
      handle: formattedHandle,
      email: email.trim(),
      password: password,
      avatar, 
      role,
      schoolOrLeague: schoolOrLeague.trim() || (role === 'scout_recruiter' ? 'NCAA / FIBA Talent Agency' : 'Playground League'),
      primarySport,
      position: position.trim() || (role === 'scout_recruiter' ? 'Certified Scout' : 'All-Around'),
      jerseyNumber: Number(jerseyNumber) || 7,
      registeredState: registeredState.trim() || 'NY',
      registeredCity: registeredCity.trim() || 'New York',
      hasCompletedLocationOnboarding: false,
      bio: bio.trim() || (role === 'scout_recruiter' ? 'Verified Talent Evaluator looking for top D1/FIBA prospects.' : 'New registered athlete on Playgrounds platform. Ready to compete and log stats!'),
      emailVerified: false,
      isVerified: false,
      isPro: false,
      isVerifiedPro: false,
      subscriptionTier: 'free',
      level: 1,
      referredByCode: pendingReferralCode,
    };

    if (role === 'scout_recruiter') {
      newUserProfile.isScout = true;
      newUserProfile.isVerifiedScout = false;
      newUserProfile.scoutPassActive = false;
      newUserProfile.scoutOrgName = schoolOrLeague.trim() || 'NCAA / FIBA Scouting Network';
    }

  

    try {
      // Register via MySQL backend
      const result = await authService.register(newUserProfile);
      
      if (!result.success || !result.athlete) {
        const errorMsg = result.error || 'Registration failed. Please try again.';
        setRegisterError(errorMsg); 
        setIsRegistering(false);
        return;
      }

        localStorage.removeItem('pending_referral_code');
        setReferralCode('');

      // Store registered email and name for verification popup
      setRegisteredEmail(email.trim());
      setRegisteredName(name.trim());

      // Send verification email
      const verificationResult = await sendVerificationEmailUtility(email.trim(), name.trim());
      
      // Send welcome email
      await sendWelcomeEmail(email.trim(), name.trim(), primarySport, role === 'playground_pro');

      // Call parent callback
      onRegisterUser(result.athlete);
 
      // Show verification popup after successful registration
      setShowVerificationPopup(true);

    } catch (error: any) {
 
      
      let errorMsg = 'Registration failed. Please try again.';
      if (error.message) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          if (error.message.includes('email')) {
            errorMsg = 'An account with this email already exists. Please login instead.';
          } else if (error.message.includes('handle')) {
            errorMsg = 'This handle is already taken. Please choose another one.';
          } else {
            errorMsg = 'An account with this information already exists.';
          }
        } else if (error.message.includes('validation')) {
          errorMsg = error.message;
        } else {
          errorMsg = error.message;
        }
      }
      setRegisterError(errorMsg);
    } finally {
      setIsRegistering(false);
    }
  };

  // ============================================
  // EMAIL VERIFICATION HANDLER
  // ============================================

  const handleEmailVerified = async () => {
 
    setIsEmailVerified(true);
    setShowVerificationPopup(false);
    
    // Refresh the user data to get updated emailVerified status
    try {
      const token = authService.getToken();
      if (token) {
        const result = await authService.verifyToken();
        if (result.valid && result.athlete) {
          // Update the athlete data in the parent component
          onRegisterUser(result.athlete);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data after verification:', error);
    }
  };

  // ============================================
  // LOGIN HANDLER
  // ============================================

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setLoginError('Please enter your email address');
      return;
    }

    if (!loginPassword || loginPassword.length < 6) {
      setLoginError('Please enter a valid password (minimum 6 characters)');
      return;
    }

    setIsLoggingIn(true);

    try {
  
      const result = await authService.login({
        email: trimmedEmail,
        password: loginPassword
      });
 
      if (!result.success || !result.athlete) {
        const errorMsg = result.error || 'Login failed. Please check your credentials.';
        setLoginError(errorMsg);
        console.error('❌ Login failed:', errorMsg);
        setIsLoggingIn(false);
        return;
      }

 
      
      // Check if email is verified
      if (!result.athlete.emailVerified) {
        setRegisteredEmail(trimmedEmail);
        setRegisteredName(result.athlete.name || '');
        setShowVerificationPopup(true);
      }
      
      onLoginSuccess('Email', trimmedEmail);
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      let errorMsg = 'Unable to verify account credentials. Please ensure you have already created an account.';
      if (error.message) {
        if (error.message.includes('not found') || error.message.includes('no account')) {
          errorMsg = 'No account found with this email. Please register first.';
        } else if (error.message.includes('password')) {
          errorMsg = 'Invalid password. Please try again.';
        } else {
          errorMsg = error.message;
        }
      }
      setLoginError(errorMsg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ============================================
  // OAUTH LOGIN HANDLER
  // ============================================

  const handleOAuthLogin = async (providerName: string) => {
    setOauthError(null);

    // Check if provider is enabled by admin
    const providerKey = providerName.toLowerCase();
    if (providerKey.includes('google') && !authProviderSettings.googleEnabled) {
      setOauthError('Google OAuth Sign-In is currently disabled by administrator. Please use Email & Password below.');
      return;
    }
    if (providerKey.includes('facebook') && !authProviderSettings.facebookEnabled) {
      setOauthError('Facebook Sign-In is currently disabled by administrator. Please use Email & Password below.');
      return;
    }
    if (providerKey.includes('apple') && !authProviderSettings.appleEnabled) {
      setOauthError('Apple ID Sign-In is currently disabled by administrator. Please use Email & Password below.');
      return;
    }

    setOauthLoading(providerName);

    try {
      const email = loginEmail.trim().toLowerCase();
      
      if (!email) {
        setOauthError('Please enter your email address to continue with OAuth.');
        setOauthLoading(null);
        return;
      }

      const validation = await authService.validateAthlete(email);
      
      if (!validation.allowed || !validation.athlete) {
        setOauthError(`Access Denied: The account "${email}" is not registered in the Playground League athletes collection. Only pre-registered athletes can authenticate. Please click "Sign Up" to create your profile first.`);
        setOauthLoading(null);
        return;
      }

      setOauthSuccess(providerName);
      setTimeout(() => {
        onLoginSuccess(providerName, email);
        setOauthSuccess(null);
      }, 800);

    } catch (err: any) {
      console.error(`${providerName} OAuth sign-in error:`, err);
      let errorMsg = `Failed to sign in with ${providerName}.`;
      
      if (err?.code === 'auth/unauthorized-domain') {
        errorMsg = `Domain "${window.location.hostname}" is not authorized for ${providerName} OAuth. Please use Email login instead.`;
        setShowDomainGuideButton(true);
        setIsDomainGuideOpen(true);
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      setOauthError(errorMsg);
    } finally {
      setOauthLoading(null);
    }
  };

  useEffect(() => {
    try {
     
      
    } catch (err) {
      console.error('[PublicAuthView] Error during mount lifecycle:', err);
    }
  }, []);

  useEffect(() => {
    if (initialAuthMode) {
      setAuthMode(initialAuthMode);
    }
  }, [initialAuthMode]);

  const handleSwitchAuthMode = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setRegisterError(null);
    setLoginError(null);
    if (onAuthModeChange) {
      onAuthModeChange(mode);
    }
  };


  useEffect(() => {
  // 1️⃣ Try query string first:  ?ref=ABC123
  const params = new URLSearchParams(window.location.search);
  let refFromUrl = params.get('ref');

  // 2️⃣ Fallback: parse path segment  /ref/ABC123
  if (!refFromUrl) {
    const pathMatch = window.location.pathname.match(/\/ref\/([A-Za-z0-9]+)/i);
    if (pathMatch) {
      refFromUrl = pathMatch[1];
    }
  }

  if (refFromUrl) {
    const cleanCode = refFromUrl.trim().toUpperCase();
    setReferralCode(cleanCode);
    localStorage.setItem('pending_referral_code', cleanCode);
  } else {
    const stored = localStorage.getItem('pending_referral_code');
    if (stored) setReferralCode(stored);
  }
}, []);


  // ============================================
  // RENDER COMPONENT
  // ============================================

  return (
    <>
      <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-fadeIn">
        {/* Game Invite Banner */}
        {invitedGameInfo && (
          <div className="bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 text-black p-5 rounded-[2rem] shadow-xl border border-white/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-bounce-short">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-black stroke-[2.5]" />
                <span className="font-black italic uppercase text-xs tracking-wider bg-black text-lime-300 px-2.5 py-0.5 rounded-full">
                  Game Invite Link Activated
                </span>
              </div>
              <h2 className="text-lg font-black italic uppercase text-black">
                You were invited to "{invitedGameInfo.title}"!
              </h2>
              <p className="text-xs font-bold text-black/80">
                Host: <span className="underline">{invitedGameInfo.host}</span> • Location: {invitedGameInfo.courtName} ({invitedGameInfo.time})
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setAuthMode('register')}
                className="px-4 py-2 bg-black hover:bg-neutral-900 text-lime-300 font-black italic uppercase text-xs rounded-xl shadow-md transition"
              >
                Sign Up & Auto-Join Game
              </button>
              <button
                onClick={() => setInvitedGameInfo(null)}
                className="p-1.5 text-black/60 hover:text-black rounded-lg"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 rounded-[2.5rem] p-8 border border-white/15 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-lime-400 via-rose-500 to-transparent" />
          
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 bg-lime-400/20 border border-lime-400/30 px-3 py-1 rounded-full text-xs font-black italic uppercase text-lime-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Public Athlete Access Portal</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black italic uppercase tracking-tight text-white">
              Join <span className="text-lime-400">Playgrounds</span> Athlete Network
            </h1>
            <p className="text-sm text-indigo-200/80 font-medium leading-relaxed">
              Register your official profile to start recording 30s game highlights, logging verified statistics, joining local pickup games, and showcasing your skills to sports fans and scouts.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-indigo-200/90">
              <div className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-lime-400" />
                <span>Multi-Sport Analytics</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-lime-400" />
                <span>30-Second Highlight Reels</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Check className="w-4 h-4 text-lime-400" />
                <span>Apple, Google & Facebook OAuth</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Box & Benefits Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Side: Auth Card */}
          <div className="lg:col-span-7 bg-indigo-900/60 backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 border border-white/10 shadow-xl text-white space-y-6">
            {/* Segmented Control */}
            <div className="flex bg-indigo-950 p-1.5 rounded-2xl border border-white/10">
              <button
                onClick={() => handleSwitchAuthMode('register')}
                className={`flex-1 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center justify-center space-x-2 ${
                  authMode === 'register' ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' : 'text-indigo-300 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Register Account</span>
              </button>
              <button
                onClick={() => handleSwitchAuthMode('login')}
                className={`flex-1 py-3 rounded-xl text-xs font-black italic uppercase transition flex items-center justify-center space-x-2 ${
                  authMode === 'login' ? 'bg-lime-400 text-black shadow-lg shadow-lime-400/20' : 'text-indigo-300 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In / SSO</span>
              </button>
            </div>

            {authMode === 'register' ? (
              // ============================================
              // REGISTER FORM
              // ============================================
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="text-center pb-2">
                  <h3 className="text-xl font-black italic uppercase text-white">Create New Athlete Profile</h3>
                  <p className="text-xs text-indigo-200/70 font-semibold">Sign up for free in less than 30 seconds</p>
                </div>

                

                {/* Avatar Selector */}
                <div className="flex items-center space-x-4 bg-indigo-950/80 p-3.5 rounded-2xl border border-white/10">
                  <img
                    src={avatar}
                   className='w-14 h-14 rounded-2xl object-cover border-2 border-lime-400 shrink-0'
                    alt="Avatar preview"  referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-1.5">
                    <span className="text-xs font-bold text-indigo-200 block">Avatar / Profile Picture</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-black rounded-xl text-xs font-black italic uppercase flex items-center space-x-1 transition shadow-md">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const compressed = await compressImageFile(file, 300, 300, 0.85);
                              if (compressed) {
                                setAvatar(compressed);
                              }
                            }
                          }}
                        />
                      </label>
                      <span className="text-[10px] text-indigo-200/60 font-semibold">Presets:</span>
                      {presetAvatars.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAvatar(url)}
                          className={`w-7 h-7 rounded-lg overflow-hidden border transition ${
                            avatar === url ? 'border-lime-400 scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt="preset" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {registerError && (
                  <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-200 text-xs font-semibold space-y-2">
                    <div className="flex items-center justify-between text-rose-300 font-black uppercase tracking-wider text-[10px]">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        Registration Error
                      </span>
                      <X 
                        className="w-4 h-4 cursor-pointer hover:text-white" 
                        onClick={() => setRegisterError(null)} 
                      />
                    </div>
                    <p className="leading-relaxed">{registerError}</p>
                    
                    {registerError.includes('already exists') && (
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterError(null);
                          setAuthMode('login');
                          setLoginEmail(email);
                        }}
                        className="w-full py-2 bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-[10px] rounded-xl transition flex items-center justify-center space-x-1.5 mt-2 shadow-md"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Switch to Login Instead</span>
                      </button>
                    )}
                    
                    {registerError.includes('password') && (
                      <div className="pt-1 text-[11px] text-rose-300/80 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p>Password must be at least 6 characters long for security.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Name & Handle */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">Full Name *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
                      <input
                        type="text" 
                        placeholder="e.g. Stephen Curry"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">User Handle *</label>
                    <div className="relative">
                      <span className="text-xs font-black text-indigo-300 absolute left-3 top-2.5">@</span>
                      <input
                        type="text" 
                        placeholder="stephen30"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Email & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
                      <input
                        type="email" 
                        placeholder="athlete@playgrounds.app"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">Password *</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
                      <input
                        type="password" 
                        placeholder="•••••••• (min 6 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                      />
                    </div>
                    <p className="text-[10px] text-indigo-300/60 mt-1">Minimum 6 characters</p>
                  </div>
                </div>

                {/* Sport & Bracket */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">Primary Sport</label>
                    <select
                      value={primarySport}
                      onChange={(e) => setPrimarySport(e.target.value as SportType)}
                      className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      <option value="basketball">Basketball 🏀</option>
                      <option value="baseball">Baseball ⚾</option>
                      <option value="softball">Softball 🥎</option>
                      <option value="pickleball">Pickleball 🏓</option>
                      <option value="soccer">Soccer ⚽</option>
                      <option value="volleyball">Volleyball 🏐</option>
                      <option value="football">Football 🏈</option>
                      <option value="tennis">Tennis 🎾</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">League Bracket</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserLevel)}
                      className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    >
                      <option value="high_school">High School Varsity</option>
                      <option value="college">College NCAA</option>
                      <option value="playground_pro">Playground Pro / Rec</option>
                      <option value="scout_recruiter">College / FIBA Scout (Recruiter Pass)</option>
                    </select>
                  </div>
                </div>

                {role === 'scout_recruiter' && (
                  <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs text-amber-200 font-semibold space-y-1 animate-fadeIn">
                    <span className="font-bold text-amber-300 block">👁️ Recruiter Pass Required for Scout Access</span>
                    <p className="text-[11px] text-amber-100/80">
                      Scout accounts allow searching player databases and downloading game reels. Unredacted athlete contact sheets require the <strong>Recruiter Pass ($49/mo)</strong>.
                    </p>
                  </div>
                )}

                {/* School, Position, Jersey */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">School / League</label>
                    <input
                      type="text"
                      placeholder="e.g. West High"
                      value={schoolOrLeague}
                      onChange={(e) => setSchoolOrLeague(e.target.value)}
                      className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">Position</label>
                    <input
                      type="text"
                      placeholder="e.g. PG / QB"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-indigo-200 block mb-1">Jersey #</label>
                    <input
                      type="number"
                      placeholder="7"
                      value={jerseyNumber}
                      onChange={(e) => setJerseyNumber(e.target.value)}
                      className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                </div>

                {/* State & City Registration Fields */}
                <StateCitySelector
                  selectedState={registeredState}
                  selectedCity={registeredCity}
                  onStateChange={(newState, defaultCity) => {
                    setRegisteredState(newState);
                    setRegisteredCity(defaultCity);
                  }}
                  onCityChange={(newCity) => setRegisteredCity(newCity)}
                />

            <div className="bg-indigo-950/80 p-3.5 rounded-2xl border border-white/10 space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
      <Gift className="w-3.5 h-3.5 text-amber-400" />
      Referral Code
      <span className="text-[10px] font-normal text-indigo-300/60">(optional)</span>
    </label>

    {referralCode && localStorage.getItem('pending_referral_code') === referralCode && (
      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-lime-400/20 text-lime-300 rounded-full border border-lime-400/30">
        ✓ Auto-applied
      </span>
    )}
  </div>

  <input
    type="text"
    value={referralCode}
    onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
    placeholder="e.g. ABC1234"
    maxLength={12}
    className="w-full p-2.5 bg-indigo-900/60 border border-white/10 rounded-xl text-xs font-mono font-bold text-white uppercase tracking-wider outline-none focus:ring-2 focus:ring-lime-400 placeholder:text-indigo-400/40 placeholder:normal-case placeholder:tracking-normal"
  />

  <p className="text-[10px] text-indigo-300/60">
    Enter a friend's code to give them credit when you sign up.
  </p>
</div>

                <button
                  type="submit"
                  disabled={isAuthInitializing || isRegistering}
                  className="w-full py-4 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black italic uppercase text-sm rounded-2xl shadow-xl shadow-lime-400/20 flex items-center justify-center space-x-2 transition mt-2"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Creating Your Profile...</span>
                    </>
                  ) : isAuthInitializing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying Profile with Server...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 stroke-[2.5]" />
                      <span>Register & Create Official Profile</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              // ============================================
              // LOGIN FORM & OAUTH
              // ============================================
              <div className="space-y-5">
                <div className="text-center">
                  <h3 className="text-xl font-black italic uppercase text-white">Log In to Your Profile</h3>
                </div>

                {isAuthInitializing && (
                  <div className="flex items-center justify-center space-x-2 bg-lime-400/10 border border-lime-400/30 p-3 rounded-2xl text-lime-300 text-xs font-bold animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                    <span>Checking authentication status...</span>
                  </div>
                )}

                {oauthError && (
                  <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-200 text-xs font-semibold space-y-2">
                    <div className="flex items-center justify-between text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Authentication Notice</span>
                      <X className="w-4 h-4 cursor-pointer" onClick={() => setOauthError(null)} />
                    </div>
                    <p>{oauthError}</p>

                    {showDomainGuideButton && (
                      <div className="pt-1 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsDomainGuideOpen(true)}
                          className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-[10px] rounded-xl transition flex items-center justify-center space-x-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>View Domain Authorization Instructions</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {oauthSuccess ? (
                  <div className="p-6 bg-lime-400/20 border border-lime-400/30 rounded-2xl text-center space-y-2">
                    <ShieldCheck className="w-10 h-10 text-lime-400 mx-auto animate-bounce" />
                    <h4 className="font-extrabold text-lime-300">
                      Logged In via {oauthSuccess.toUpperCase()}!
                    </h4>
                    <p className="text-xs text-indigo-200/70 font-semibold">Session initialized securely.</p>
                  </div>
                ) : (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                      <div className="relative flex justify-center text-[10px] uppercase font-black tracking-wider">
                        <span className="bg-indigo-900/90 px-3 text-indigo-300/80">
                          <span className="text-lime-300 font-bold flex items-center gap-1">
                            <Lock className="w-3 h-3 text-lime-400" />
                            <span>Email & Password Login</span>
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Login Error Notification Banner */}
                    {loginError && (
                      <div className="p-4 bg-rose-500/20 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-semibold space-y-2 animate-shake">
                        <div className="flex items-center justify-between text-rose-300 font-black uppercase tracking-wider text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400" /> 
                            Login Error
                          </span>
                          <X className="w-4 h-4 cursor-pointer hover:text-white" onClick={() => setLoginError(null)} />
                        </div>
                        <p className="leading-relaxed">{loginError}</p>
                        
                        {loginError.includes('No account found') && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoginError(null);
                              setAuthMode('register');
                              setEmail(loginEmail);
                            }}
                            className="w-full py-2 bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-[10px] rounded-xl transition flex items-center justify-center space-x-1.5 mt-2 shadow-md"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Register a Free Account Now (Sign Up)</span>
                          </button>
                        )}
                        
                        {loginError.includes('Invalid password') && (
                          <div className="pt-1 text-[11px] text-rose-300/80 flex items-start gap-1.5">
                            <Key className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <p>Forgot your password? Click the "Forgot Password?" link below to reset it.</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Standard Email Form */}
                    <form onSubmit={handleEmailLoginSubmit} className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-indigo-200 block mb-1">Email Address</label>
                        <input
                          type="email" 
                          placeholder="athlete@playgrounds.app"
                          value={loginEmail}
                          onChange={(e) => {
                            setLoginEmail(e.target.value);
                            if (loginError) setLoginError(null);
                          }}
                          className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-indigo-200 block mb-1">Password</label>
                        <input
                          type="password" 
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => {
                            setLoginPassword(e.target.value);
                            if (loginError) setLoginError(null);
                          }}
                          className="w-full p-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-200/80 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsPasswordResetOpen(true)}
                          className="text-lime-400 hover:underline flex items-center space-x-1"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Forgot Password?</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsSupportOpen(true)}
                          className="text-indigo-300 hover:text-white flex items-center space-x-1"
                        >
                          <LifeBuoy className="w-3.5 h-3.5 text-lime-300" />
                          <span>Support Desk</span>
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isAuthInitializing || isLoggingIn}
                        className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black italic uppercase text-xs rounded-xl transition shadow-md flex items-center justify-center space-x-2"
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Account...</span>
                          </>
                        ) : isAuthInitializing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Checking Authentication...</span>
                          </>
                        ) : (
                          <span>Log In to Playgrounds</span>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Platform Highlights */}
          <div className="lg:col-span-5 space-y-4 text-white">
            <div className="bg-indigo-900/40 p-6 rounded-[2.5rem] border border-white/10 space-y-4">
              <h3 className="font-black italic uppercase text-lime-400 text-lg flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-lime-400" />
                Why Register on Playgrounds?
              </h3>

              <div className="space-y-3.5 text-xs text-indigo-200/90 font-medium">
                <div className="flex items-start space-x-3 bg-indigo-950/60 p-3 rounded-2xl border border-white/5">
                  <Flame className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Verified Game Stat Logging</span>
                    <span className="text-[11px] text-indigo-300/70">Log points, assists, home runs, aces, and passing yards with instant leaderboard updates.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-indigo-950/60 p-3 rounded-2xl border border-white/5">
                  <Film className="w-5 h-5 text-lime-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">30s Highlight Reel Clips</span>
                    <span className="text-[11px] text-indigo-300/70">Record or upload 30-second game clips attached directly to your public athlete scout profile.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-indigo-950/60 p-3 rounded-2xl border border-white/5">
                  <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Geofenced Court Check-ins</span>
                    <span className="text-[11px] text-indigo-300/70">Auto-checkin to local courts, alert active players, and host pickup runs on the interactive map.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-indigo-950/60 p-3 rounded-2xl border border-white/5">
                  <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Official Desk & Support</span>
                    <span className="text-[11px] text-indigo-300/70">Need assistance? Reach out directly to <strong className="text-lime-300">support@playgroundleague.pro</strong>.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== EMAIL VERIFICATION POPUP ===== */}
      {showVerificationPopup && (
        <EmailVerifypopup
          userEmail={registeredEmail}
          isVerified={isEmailVerified}
          onVerifiedSimulated={handleEmailVerified}
        />
      )}

      {/* Password Reset Modal */}
      {isPasswordResetOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-indigo-900/95 text-white rounded-[2.5rem] border border-amber-400/40 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 relative">
            <button
              onClick={() => setIsPasswordResetOpen(false)}
              className="absolute top-5 right-5 p-2 text-indigo-200 hover:text-white rounded-full bg-indigo-950/80 border border-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-400 text-black rounded-2xl mx-auto flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic uppercase">Reset Password</h3>
              <p className="text-xs text-indigo-200/80">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const emailInput = form.elements.namedItem('resetEmail') as HTMLInputElement;
              if (emailInput?.value) {
                try {
                  const result = await authService.sendPasswordResetEmail(emailInput.value);
                  if (result.success) {
                    alert(result.message || 'Password reset email sent! Check your inbox.');
                    setIsPasswordResetOpen(false);
                  } else {
                    alert(result.message || 'Failed to send reset email. Please try again.');
                  }
                } catch (error) {
                  alert('Failed to send reset email. Please try again.');
                }
              }
            }} className="space-y-4">
              <input
                type="email"
                name="resetEmail"
                placeholder="athlete@playgrounds.app"
                className="w-full p-3 bg-indigo-950 border border-white/10 rounded-xl text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-xs rounded-xl transition shadow-md"
              >
                Send Reset Link
              </button>
            </form>

            <button
              onClick={() => setIsPasswordResetOpen(false)}
              className="w-full text-center text-xs text-indigo-300 hover:text-white font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Support Modal */}
      {isSupportOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-indigo-900/95 text-white rounded-[2.5rem] border border-amber-400/40 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 relative">
            <button
              onClick={() => setIsSupportOpen(false)}
              className="absolute top-5 right-5 p-2 text-indigo-200 hover:text-white rounded-full bg-indigo-950/80 border border-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-lime-400 text-black rounded-2xl mx-auto flex items-center justify-center">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic uppercase">Support Desk</h3>
              <p className="text-xs text-indigo-200/80">
                Need help? Contact our support team directly.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-indigo-950/80 rounded-xl border border-white/10 text-center">
                <p className="text-xs font-semibold text-indigo-200">Email Support</p>
                <a 
                  href="mailto:support@playgroundleague.pro" 
                  className="text-lime-400 font-bold hover:underline text-sm"
                >
                  support@playgroundleague.pro
                </a>
              </div>
              <div className="p-4 bg-indigo-950/80 rounded-xl border border-white/10 text-center">
                <p className="text-xs font-semibold text-indigo-200">Response Time</p>
                <p className="text-sm text-white font-bold">24-48 hours</p>
              </div>
            </div>

            <button
              onClick={() => setIsSupportOpen(false)}
              className="w-full py-3 bg-indigo-800 hover:bg-indigo-700 text-white font-black uppercase text-xs rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Domain Guide Modal */}
      {isDomainGuideOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-indigo-900/95 text-white rounded-[2.5rem] border border-amber-400/40 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsDomainGuideOpen(false)}
              className="absolute top-5 right-5 p-2 text-indigo-200 hover:text-white rounded-full bg-indigo-950/80 border border-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-400 text-black rounded-2xl mx-auto flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black italic uppercase">Domain Authorization</h3>
              <p className="text-xs text-indigo-200/80">
                How to authorize your domain for OAuth providers.
              </p>
            </div>

            <div className="space-y-3 text-xs text-indigo-200/90 leading-relaxed">
              <div className="p-3 bg-indigo-950/80 rounded-xl border border-white/10">
                <p className="font-bold text-white">For Google OAuth:</p>
                <ol className="list-decimal list-inside space-y-1 mt-1 text-indigo-200/80">
                  <li>Go to Google Cloud Console</li>
                  <li>Navigate to APIs &amp; Services → Credentials</li>
                  <li>Edit your OAuth 2.0 Client ID settings</li>
                  <li>Add <code className="text-lime-300 bg-indigo-950 px-1 rounded">{window.location.origin}</code> to Authorized JavaScript origins</li>
                  <li>Save and wait 5-10 minutes for propagation</li>
                </ol>
              </div>
              <div className="p-3 bg-indigo-950/80 rounded-xl border border-white/10">
                <p className="font-bold text-white">For Facebook OAuth:</p>
                <ol className="list-decimal list-inside space-y-1 mt-1 text-indigo-200/80">
                  <li>Go to Facebook Developer Console</li>
                  <li>Select your app → Settings → Basic</li>
                  <li>Add <code className="text-lime-300 bg-indigo-950 px-1 rounded">{window.location.origin}</code> to App Domains</li>
                  <li>Save and wait for changes to take effect</li>
                </ol>
              </div>
              <div className="p-3 bg-indigo-950/80 rounded-xl border border-white/10">
                <p className="font-bold text-white">For Apple OAuth:</p>
                <ol className="list-decimal list-inside space-y-1 mt-1 text-indigo-200/80">
                  <li>Go to Apple Developer Console</li>
                  <li>Navigate to Certificates, Identifiers &amp; Profiles</li>
                  <li>Edit your Service ID configuration</li>
                  <li>Add <code className="text-lime-300 bg-indigo-950 px-1 rounded">{window.location.origin}</code> to Return URLs</li>
                  <li>Save and wait for propagation</li>
                </ol>
              </div>
              <p className="text-center text-[10px] text-indigo-300/60 font-semibold">
                ⚡ Changes may take up to 15 minutes to propagate.
              </p>
            </div>

            <button
              onClick={() => setIsDomainGuideOpen(false)}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-xs rounded-xl transition"
            >
              Got it, I'll set this up
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicAuthView;