// components/VerificationGatedModal.tsx
import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, KeyRound, ShieldCheck, Loader2, Mail, Check, AlertTriangle } from 'lucide-react';
import { authService } from '../services/authService';

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
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
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
        onVerifyNow?.();
        setTimeout(() => {
          onClose();
          setShowSuccess(false);
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
 
        }
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setMessage(result.error || 'Failed to resend code.');
      }
    } catch (error) {
      setMessage('Failed to resend verification code.');
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
            <Check className="w-4 h-4" />
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
              placeholder="Enter 6-digit code"
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