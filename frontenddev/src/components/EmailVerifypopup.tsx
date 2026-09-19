import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Mail, CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles, KeyRound, Check, ShieldCheck, Copy, Loader2 } from 'lucide-react';
import { authService } from '../services/authService';

interface EmailVerifypopupProps {
  userEmail?: string;
  isVerified?: boolean;
  onVerifiedSimulated?: () => void;
}

export const EmailVerifypopup: React.FC<EmailVerifypopupProps> = ({
  userEmail = '',
  isVerified = false, 
  onVerifiedSimulated,
}) => {
 const [emailVerified, setEmailVerified] = useState(() => {
  try {
    const userData = localStorage.getItem('playground_user');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.email_verified === 1 || parsed.email_verified === true;
    }
    return false;
  } catch (error) {
  
    return false;
  }
});
  const [dismissed, setDismissed] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
 
  if (emailVerified || dismissed || !userEmail) return null;

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const result = await authService.verifyEmailCode(userEmail, otpInput.trim());
      
      if (result.success) {
        setIsOtpModalOpen(false);
        setShowSuccess(true);
        setMessage('Email verified successfully!');
        setDismissed(true);
        onVerifiedSimulated?.();

         toast.success('Email verified successfully! 🎉', {
        duration: 4000,
        position: 'top-right',
        icon: '✅',
         style: {
            background: '#065f46',
            color: '#fff',
            border: '1px solid rgba(52, 211, 153, 0.3)',
          },
      });


        setTimeout(() => {
          setShowSuccess(false);
          setMessage(null);
        }, 4000);
      } else {
        setOtpError(result.error || 'Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      setOtpError(error?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendEmail = async () => {
    setIsSending(true);
    setOtpError(null);
    setMessage(null);

    try {
      const result = await authService.resendVerificationCode(userEmail);
      
      if (result.success) {
        setMessage('New verification code sent! Check your email.');
        if (result.verificationCode) {
          setActiveCode(result.verificationCode);
       
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setMessage(null);
        }, 5000);
      } else {
        setMessage(result.error || 'Failed to resend verification code.');
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (error) {
      setMessage('Failed to resend verification code. Please try again.');
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  // const handleCopyCode = () => {
  //   if (!activeCode) return;
  //   navigator.clipboard?.writeText(activeCode);
  //   setCopiedCode(true);
  //   setTimeout(() => setCopiedCode(false), 2000);
  // };

  return (
    <>
      <div id="email-verification-banner" className="bg-gradient-to-r from-amber-500/20 via-indigo-900/90 to-amber-500/20 border-b border-amber-400/30 text-white px-4 py-3 relative shadow-md animate-fadeIn my-2 rounded-full">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 text-xs font-semibold">
          
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-400 text-black rounded-lg shrink-0 shadow-sm">
              <Mail className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-extrabold text-amber-300 mr-1.5 uppercase tracking-wider text-[11px]">
                Email Verification Pending
              </p>
              <span className="text-indigo-100">
                Please verify <strong className="text-white underline">{userEmail}</strong> to host pickup games, access leaderboards, and enter tournaments.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {showSuccess && message && (
              <span className="text-lime-300 font-bold text-[11px] bg-black/50 px-3 py-1 rounded-lg border border-lime-400/30 flex items-center space-x-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>{message}</span>
              </span>
            )}

            {message && !showSuccess && (
              <span className="text-amber-300 font-bold text-[11px] bg-black/50 px-3 py-1 rounded-lg border border-amber-400/30 flex items-center space-x-1.5 animate-fadeIn">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{message}</span>
              </span>
            )}

            <button
              id="resend-verification-email-btn"
              onClick={handleResendEmail}
              disabled={isSending}
              className={`px-3.5 py-1.5 font-black uppercase text-[10px] rounded-xl transition flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer ${
                showSuccess && message?.includes('sent')
                  ? 'bg-lime-400 text-black border border-lime-300 shadow-md ring-2 ring-lime-400/40'
                  : 'bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black'
              }`}
              title="Resend verification email"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : showSuccess && message?.includes('sent') ? (
                <>
                  <Check className="w-3 h-3 text-black stroke-[3]" />
                  <span>Sent!</span>
                </>
              ) : (
                <>
                  <Mail className="w-3 h-3" />
                  <span>Resend Verification</span>
                </>
              )}
            </button>

            <button
              id="enter-otp-code-btn"
              onClick={() => setIsOtpModalOpen(true)}
              className="px-3.5 py-1.5 bg-indigo-950 hover:bg-indigo-800 text-lime-400 border border-lime-400/50 font-black uppercase text-[10px] rounded-xl transition flex items-center space-x-1 shadow-sm active:scale-95 cursor-pointer"
              title="Enter verification code"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Enter Code</span>
            </button>

            <button
              id="dismiss-verification-banner-btn"
              onClick={() => setDismissed(true)}
              className="p-1 text-indigo-300 hover:text-white rounded-lg transition"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* OTP VERIFICATION MODAL */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-indigo-900/95 text-white rounded-[2.5rem] border border-amber-400/40 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 relative">
            <button
              onClick={() => setIsOtpModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-indigo-200 hover:text-white rounded-full bg-indigo-950/80 border border-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-amber-400 text-black rounded-2xl mx-auto flex items-center justify-center font-black text-xl shadow-lg">
                <KeyRound className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                Enter Verification Code
              </h3>
              <p className="text-xs text-indigo-200/90 font-medium">
                Enter the 6-digit security code sent to <strong className="text-lime-300">{userEmail}</strong>
              </p>
            </div>

           
            {otpError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs font-bold text-rose-300 text-center">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-indigo-200 mb-4 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="0 0 0 0 0 0"
                  className="w-full text-center text-2xl font-mono tracking-[0.4em] font-black bg-indigo-950 border-2 border-lime-400/50 focus:border-lime-400 rounded-2xl py-3 text-lime-400 outline-none placeholder:text-indigo-600 shadow-inner"
                  autoFocus
                />
                <p className="text-[10px] text-indigo-300/60 text-center mt-2">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpInput.trim().length < 6}
                  className="w-full py-3.5 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-black uppercase text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 active:scale-95"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Verify Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="text-center pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isSending}
                className="text-xs text-amber-300 hover:text-amber-200 font-bold underline flex items-center justify-center space-x-1"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Didn't get an email? Resend verification code</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface VerificationGatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  featureName?: string;
  onVerifyNow?: () => void;
}

export const VerificationGatedModal: React.FC<VerificationGatedModalProps> = ({
  isOpen,
  onClose,
  userEmail = 'athlete@playgroundleague.pro',
  featureName = 'Competitive Action',
  onVerifyNow,
}) => {
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) return;

    setIsVerifying(true);
    setOtpError(null);

    try {
      const result = await authService.verifyEmailCode(userEmail, otpInput.trim());
      
      if (result.success) {
        setShowSuccess(true);
        setMessage('Email verified successfully!');
        onVerifyNow?.();
        setTimeout(() => {
          onClose();
          setShowSuccess(false);
          setMessage(null);
        }, 1500);
      } else {
        setOtpError(result.error || 'Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      setOtpError(error?.message || 'Verification failed. Please check the code.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsSending(true);
    setOtpError(null);
    setMessage(null);

    try {
      const result = await authService.resendVerificationCode(userEmail);
      
      if (result.success) {
        setMessage('New verification code sent!');
        if (result.verificationCode) {
          setActiveCode(result.verificationCode);
          setOtpInput(result.verificationCode);
        }
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setMessage(null);
        }, 3000);
      } else {
        setMessage(result.error || 'Failed to resend code.');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage('Failed to resend verification code.');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-indigo-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-indigo-900/95 text-white rounded-[2.5rem] border border-amber-400/40 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-5 text-center relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-indigo-200 hover:text-white rounded-full bg-indigo-950/80 border border-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-amber-400/20 border border-amber-400/40 text-amber-400 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
            Email Verification Required
          </h3>
          <p className="text-xs text-indigo-200 font-medium leading-relaxed">
            To access <span className="text-amber-300 font-bold">{featureName}</span>, please verify your email address (<strong className="text-white">{userEmail}</strong>).
          </p>
        </div>

        {activeCode && (
          <div className="p-3 bg-indigo-950/90 rounded-2xl border border-lime-400/30 text-left">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">
              Your Verification Code:
            </span>
            <span className="font-mono text-xl font-black text-lime-400 tracking-widest">
              {activeCode}
            </span>
          </div>
        )}

        {showSuccess && (
          <div className="p-3 bg-lime-400/20 border border-lime-400/30 rounded-xl text-xs font-bold text-lime-300 flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{message || 'Verified successfully!'}</span>
          </div>
        )}

        {otpError && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs font-bold text-rose-300">
            {otpError}
          </div>
        )}

        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              maxLength={6}
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0 0 0 0 0 0"
              className="flex-1 text-center font-mono font-bold tracking-widest text-lg bg-indigo-950 border border-white/20 focus:border-lime-400 rounded-xl py-2.5 text-lime-300 outline-none"
            />
            <button
              type="submit"
              disabled={isVerifying || otpInput.trim().length < 6}
              className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 text-black font-black uppercase text-xs rounded-xl shadow-md transition whitespace-nowrap"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </form>

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={isSending}
            className={`w-full py-3 font-black uppercase text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 ${
              showSuccess && message?.includes('sent')
                ? 'bg-lime-400 text-black border border-lime-300 ring-2 ring-lime-400/40'
                : 'bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black'
            }`}
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Sending...</span>
              </>
            ) : showSuccess && message?.includes('sent') ? (
              <>
                <Check className="w-4 h-4 text-black stroke-[3]" />
                <span>Sent!</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Resend Verification Code</span>
              </>
            )}
          </button>

          {onVerifyNow && (
            <button
              type="button"
              onClick={() => {
                onVerifyNow();
                setShowSuccess(true);
                setMessage('Verified successfully!');
                setTimeout(() => {
                  onClose();
                  setShowSuccess(false);
                  setMessage(null);
                }, 1500);
              }}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black uppercase text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Verify Instantly</span>
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-white/10 text-xs text-indigo-200/70">
          Check your email for the verification code
        </div>
      </div>
    </div>
  );
};