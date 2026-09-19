import React, { useState } from 'react';
import { X, Mail, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onOpenSupport?: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onOpenSupport,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-indigo-950 rounded-[2rem] p-6 sm:p-8 max-w-md w-full border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black italic uppercase text-white">Reset Password</h3>
          <button
            onClick={onClose}
            className="p-1.5 bg-indigo-900 rounded-xl text-indigo-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-lime-400/20 border border-lime-400/30 rounded-2xl">
              <CheckCircle className="w-6 h-6 text-lime-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Check Your Email</p>
                <p className="text-xs text-indigo-300">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 text-black font-black italic uppercase text-sm rounded-xl transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-indigo-200/80 font-medium">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-indigo-200 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-indigo-300 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="athlete@playgrounds.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-indigo-950 border border-white/10 rounded-xl text-xs font-semibold text-white outline-none focus:ring-2 focus:ring-lime-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-lime-400 hover:bg-lime-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black italic uppercase text-sm rounded-xl transition flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenSupport) onOpenSupport();
              }}
              className="w-full text-center text-xs text-indigo-300 hover:text-lime-400 font-semibold transition"
            >
              Need help? Contact Support
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordResetModal;