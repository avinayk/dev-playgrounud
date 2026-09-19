// components/ProCheckoutModal.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crown, X, CreditCard, CheckCircle2, Loader2, ShieldCheck,
  Building2, DollarSign, Receipt, Copy,
} from 'lucide-react';
import { createCheckoutSession } from '../services/stripe.service';
import type { AthleteProfile } from '../types/auth.types';

interface ProCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AthleteProfile;
  merchantPaypalEmail?: string;
  merchantBankDetails?: {
    bankName?: string;
    accountHolder?: string;
    accountNumber?: string;
    routingNumber?: string;
    swiftIban?: string;
  };
  onPaymentSuccess: (updatedPartial: Partial<AthleteProfile>) => void;
}

export const ProCheckoutModal: React.FC<ProCheckoutModalProps> = ({
  isOpen,
  onClose,
  user,
  merchantPaypalEmail,
  merchantBankDetails,
  onPaymentSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMerchantDetails, setShowMerchantDetails] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isProUser = !!((user as any).isPro || (user as any).is_pro);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleStartStripeCheckout = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(user.id, user.email);
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (err: any) {
      setError(err?.message || 'Stripe checkout failed');
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-indigo-950 border-2 border-amber-400/60 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.4)]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 via-indigo-900 to-indigo-950 p-6 border-b border-amber-400/30">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-5 right-5 p-2 rounded-full bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-white/10 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-amber-400 to-yellow-300 text-black rounded-2xl shadow-lg">
              <Crown className="w-7 h-7 fill-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-black rounded-full font-mono">
                  {isProUser ? 'PRO MEMBER 👑' : 'UPGRADE TO PRO'}
                </span>
              </div>
              <h3 className="text-xl font-black italic uppercase text-white mt-1">
                {isProUser ? 'Manage PRO Subscription' : 'Playground PRO Tier'}
              </h3>
              <p className="text-xs text-indigo-200/70 font-semibold">
                $9.99 / month • Cancel anytime • Instant activation
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Status pill */}
          {isProUser && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-xs">
                  <span className="font-black text-emerald-300 block">PRO Status Active</span>
                  <span className="text-indigo-200/70 font-mono">
                    Receipt: {(user as any).paymentReceiptId || 'INV-PRO-2026'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-400 text-black text-[10px] font-black font-mono rounded-lg">
                ACTIVE
              </span>
            </div>
          )}

          {/* Perks */}
          <div className="grid grid-cols-1 gap-2.5">
            {[
              'Advanced analytics & trend projections',
              '100% Ad-free browsing across all dashboards',
              'Verified gold crown badge on leaderboards',
              'Priority court reservations & HD video uploads',
              'Custom theme palettes (4 stadium themes)',
              'Unlimited PRO highlights & reel showcases',
            ].map((perk, i) => (
              <div
                key={i}
                className="p-3 bg-indigo-950/80 rounded-xl border border-white/10 flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-lime-400 shrink-0" />
                <span className="text-xs text-indigo-100 font-semibold">{perk}</span>
              </div>
            ))}
          </div>

          {/* Stripe Payment Section */}
          <div className="p-5 bg-gradient-to-br from-indigo-900/60 via-indigo-950 to-indigo-900/60 rounded-2xl border border-amber-400/40 space-y-3">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
              <CreditCard className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-black italic uppercase text-white">
                Secure Stripe Checkout
              </h4>
              <span className="ml-auto px-2 py-0.5 bg-lime-400/20 border border-lime-400/40 text-[9px] font-black font-mono text-lime-300 rounded-full">
                PCI-DSS COMPLIANT
              </span>
            </div>

            <p className="text-[11px] text-indigo-200/80 leading-relaxed">
              You will be redirected to Stripe's secure payment page. We accept
              all major credit/debit cards, Apple Pay, and Google Pay.
            </p>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-xl text-xs text-rose-300 font-semibold">
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleStartStripeCheckout}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-200 disabled:opacity-60 disabled:cursor-not-allowed text-black font-black italic uppercase text-xs tracking-wider rounded-xl shadow-xl shadow-amber-400/30 flex items-center justify-center space-x-2 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to Stripe...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {isProUser ? 'Update Payment Method' : 'Pay $9.99 & Upgrade'}
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center justify-center space-x-4 text-[10px] text-indigo-300/70 font-mono pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-lime-400" />
                256-bit SSL
              </span>
              <span>•</span>
              <span>Cancel anytime</span>
              <span>•</span>
              <span>Instant activation</span>
            </div>
          </div>

          {/* Merchant Receiving Details (Collapsible) */}
          {(merchantPaypalEmail || merchantBankDetails) && (
            <div className="border-t border-white/10 pt-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowMerchantDetails(!showMerchantDetails)}
                className="w-full flex items-center justify-between text-xs font-black italic uppercase text-indigo-300 hover:text-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  View Merchant Receiving Accounts
                </span>
                <span className="text-[10px] font-mono">
                  {showMerchantDetails ? '▲ Hide' : '▼ Show'}
                </span>
              </button>

              <AnimatePresence>
                {showMerchantDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {merchantPaypalEmail && (
                      <div className="p-3 bg-indigo-900/60 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono font-black text-amber-300 uppercase block">
                            PayPal Receiving
                          </span>
                          <span className="text-[11px] font-mono text-white">
                            {merchantPaypalEmail}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(merchantPaypalEmail, 'paypal')}
                          className="px-2 py-1 bg-lime-400 text-black rounded-lg text-[9px] font-black uppercase"
                        >
                          {copied === 'paypal' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}

                    {merchantBankDetails?.accountNumber && (
                      <div className="p-3 bg-indigo-900/60 rounded-xl border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] font-mono font-black text-lime-400 uppercase block">
                            Bank Account ({merchantBankDetails.bankName})
                          </span>
                          <span className="text-[11px] font-mono text-white">
                            {merchantBankDetails.accountNumber} • Routing{' '}
                            {merchantBankDetails.routingNumber}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleCopy(merchantBankDetails.accountNumber || '', 'bank')
                          }
                          className="px-2 py-1 bg-lime-400 text-black rounded-lg text-[9px] font-black uppercase"
                        >
                          {copied === 'bank' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-indigo-950/90">
          <span className="text-[10px] font-mono text-indigo-300/70">
            Powered by Stripe • Test Mode Active
          </span>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-extrabold uppercase rounded-xl transition disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProCheckoutModal;